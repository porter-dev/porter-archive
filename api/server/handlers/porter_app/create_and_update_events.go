package porter_app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/deployment_target"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/porter_app/notifications"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateUpdatePorterAppEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateUpdatePorterAppEventHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateUpdatePorterAppEventHandler {
	return &CreateUpdatePorterAppEventHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

const (
	crashLoopBackoffSubstring string = "stuck in a restart loop"
)

func (p *CreateUpdatePorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-post-porter-app-event")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateOrUpdatePorterAppEventRequest{}
	if ok := p.DecodeAndValidate(w, r, request); !ok {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	appName, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: appName},
		telemetry.AttributeKV{Key: "porter-app-event-type", Value: string(request.Type)},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: string(request.Status)},
		telemetry.AttributeKV{Key: "porter-app-event-external-source", Value: request.TypeExternalSource},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: request.ID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: request.DeploymentTargetID},
	)

	if request.Type == types.PorterAppEventType_Build {
		validateApplyV2 := project.GetFeatureFlag(models.ValidateApplyV2, p.Config().LaunchDarklyClient)
		reportBuildStatus(ctx, request, p.Config(), user, project, appName, validateApplyV2)
	}

	// This branch will only be hit for v2 app_event type events
	if request.ID == "" && request.DeploymentTargetID != "" && request.Type == types.PorterAppEventType_AppEvent {
		agent, err := p.GetAgent(r, cluster, "")
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error getting agent")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		err = p.handleNotification(ctx, request, project.ID, cluster.ID, agent)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error handling notification")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
			return
		}
		return
	}

	if request.ID == "" {
		event, err := p.createNewAppEvent(ctx, *cluster, appName, request.DeploymentTargetID, request.Status, string(request.Type), request.TypeExternalSource, request.Metadata)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error creating new app event")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		p.WriteResult(w, r, event)
		return
	}

	event, err := p.updateExistingAppEvent(ctx, *cluster, appName, *request)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error creating new app event")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	p.WriteResult(w, r, event)
}

func reportBuildStatus(ctx context.Context, request *types.CreateOrUpdatePorterAppEventRequest, config *config.Config, user *models.User, project *models.Project, stackName string, validateApplyV2 bool) {
	ctx, span := telemetry.NewSpan(ctx, "report-build-status")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-build-status", Value: string(request.Status)})

	var errStr string
	var buildLogs string
	if errors, ok := request.Metadata["errors"]; ok {
		if errs, ok := errors.(map[string]interface{}); ok {
			errStringMap := make(map[string]string)
			for k, v := range errs {
				if valueStr, ok := v.(string); ok {
					if k == "b64-build-logs" {
						buildLogs = valueStr
					} else {
						errStringMap[k] = valueStr
					}
				}
			}

			for k, v := range errStringMap {
				telemetry.WithAttributes(span, telemetry.AttributeKV{Key: telemetry.AttributeKey(fmt.Sprintf("resource-%s", k)), Value: v})
				errStr += k + ": " + v + ", "
			}
			errStr = strings.TrimSuffix(errStr, ", ")
			_ = telemetry.Error(ctx, span, nil, errStr)
		}
	}

	_ = TrackStackBuildStatus(ctx, config, user, project, stackName, errStr, request.Status, validateApplyV2, buildLogs)
}

// createNewAppEvent will create a new app event for the given porter app name. If the app event is an agent event, then it will be created only if there is no existing event which has the agent ID. In the case that an existing event is found, that will be returned instead
func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, cluster models.Cluster, porterAppName string, deploymentTargetID string, status types.PorterAppEventStatus, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-porter-app-event")
	defer span.End()

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, porterAppName)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error retrieving porter app by name for cluster")
	}
	if app == nil || app.ID == 0 {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app not found")
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: app.ID},
		telemetry.AttributeKV{Key: "porter-app-name", Value: porterAppName},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	if eventType == string(types.PorterAppEventType_AppEvent) {
		// Agent has no way to know what the porter app event id is, so if we must dedup here
		// TODO: create a filter to filter by only agent events. Not an issue now as app events are deduped per hour on the agent side
		if agentEventID, ok := requestMetadata["agent_event_id"]; ok {
			var existingEvents []*models.PorterAppEvent
			if deploymentTargetID == "" {
				existingEvents, _, err = p.Repo().PorterAppEvent().ListEventsByPorterAppID(ctx, app.ID)
				if err != nil {
					return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error listing porter app events for event type")
				}
			} else {
				deploymentTargetUUID, err := uuid.Parse(deploymentTargetID)
				if err != nil {
					return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error parsing deployment target id")
				}
				if deploymentTargetUUID == uuid.Nil {
					return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "deployment target id cannot be nil")
				}

				existingEvents, _, err = p.Repo().PorterAppEvent().ListEventsByPorterAppIDAndDeploymentTargetID(ctx, app.ID, deploymentTargetUUID)
				if err != nil {
					return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error listing porter app events for event type with deployment target id")
				}
			}

			for _, existingEvent := range existingEvents {
				if existingEvent != nil && existingEvent.Type == eventType {
					existingAgentEventID, ok := existingEvent.Metadata["agent_event_id"]
					if !ok {
						continue
					}
					if existingAgentEventID == 0 {
						continue
					}
					if existingAgentEventID == agentEventID {
						return existingEvent.ToPorterAppEvent(), nil
					}
				}
			}
		}

		// before creating a new app_event type event, check the event for crashloop backoff
		// if the event is a crashloop backoff, then update the service status of the deployment event associated it to FAILED, since the service's deployment will never succeed from crashloop backoff
		// only applies to v2 apps (where the deployment target id is not empty)
		if deploymentTargetID != "" {
			updateMetadata, appEventFormattedCorrectly := appEventMatchesDetail(requestMetadata, crashLoopBackoffSubstring)
			if appEventFormattedCorrectly {
				_ = p.updateDeployEventMatchingAppEventDetails(
					ctx,
					porterAppName,
					app.ID,
					deploymentTargetID,
					updateMetadata,
					types.PorterAppEventStatus_Failed,
				)
			}
		}
	}

	if eventType == string(types.PorterAppEventType_Deploy) {
		// Agent has no way to know what the porter app event id is, so update the deploy event if it exists
		if _, ok := requestMetadata["deploy_status"]; ok {
			return p.updateDeployEvent(ctx, porterAppName, app.ID, deploymentTargetID, requestMetadata), nil
		}
	}

	event := models.PorterAppEvent{
		ID:                 uuid.New(),
		Status:             string(status),
		Type:               eventType,
		TypeExternalSource: externalSource,
		PorterAppID:        app.ID,
		Metadata:           make(map[string]any),
	}

	if deploymentTargetID != "" {
		deploymentTargetUUID, err := uuid.Parse(deploymentTargetID)
		if err != nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error parsing deployment target id")
		}
		if deploymentTargetUUID == uuid.Nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "deployment target id cannot be nil")
		}
		event.DeploymentTargetID = deploymentTargetUUID
	}

	for k, v := range requestMetadata {
		event.Metadata[k] = v
	}

	err = p.Repo().PorterAppEvent().CreateEvent(ctx, &event)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event.ToPorterAppEvent(), nil
}

func (p *CreateUpdatePorterAppEventHandler) updateExistingAppEvent(ctx context.Context, cluster models.Cluster, porterAppName string, submittedEvent types.CreateOrUpdatePorterAppEventRequest) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, porterAppName)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error retrieving porter app by name for cluster")
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: app.ID},
		telemetry.AttributeKV{Key: "porter-app-name", Value: porterAppName},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	if submittedEvent.ID == "" {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event id is required")
	}
	submittedEventID, err := uuid.Parse(submittedEvent.ID)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error parsing porter app event id as uuid")
	}

	existingAppEvent, err := p.Repo().PorterAppEvent().ReadEvent(ctx, submittedEventID)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error retrieving porter app event by id")
	}

	if submittedEvent.Status != "" {
		existingAppEvent.Status = string(submittedEvent.Status)
	}

	if submittedEvent.Metadata != nil {
		for k, v := range submittedEvent.Metadata {
			existingAppEvent.Metadata[k] = v
		}
	}

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &existingAppEvent)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error updating porter app event")
	}

	return existingAppEvent.ToPorterAppEvent(), nil
}

// updateDeployEvent attempts to update the deploy event with the deploy status of each service given in updatedStatusMetadata
// an update is only made in the following cases:
// 1. the deploy event is found
// 2. the deploy event is in the PROGRESSING state
// 3. the deploy event service deployment metadata is formatted correctly
// 4. the services specified in the updatedStatusMetadata match the services in the deploy event metadata
// 5. some of the above services are still in the PROGRESSING state
// if one of these conditions is not met, then an empty event is returned and no update is made; otherwise, the matched event is returned
func (p *CreateUpdatePorterAppEventHandler) updateDeployEvent(ctx context.Context, appName string, appID uint, deploymentTargetID string, updatedStatusMetadata map[string]any) types.PorterAppEvent {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event")
	defer span.End()

	var serviceName string
	var matchEvent models.PorterAppEvent

	if deploymentTargetID != "" {
		appRevisionIDField, ok := updatedStatusMetadata["app_revision_id"]
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "app_revision_id not found in request metadata")
			return types.PorterAppEvent{}
		}
		appRevisionID, ok := appRevisionIDField.(string)
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "appRevisionID is not a string")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-revision-id", Value: appRevisionID})

		serviceNameField, ok := updatedStatusMetadata["service_name"]
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "service_name not found in request metadata")
			return types.PorterAppEvent{}
		}
		serviceName, ok = serviceNameField.(string)
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "serviceName is not a string")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: serviceName})

		var err error
		matchEvent, err = p.Repo().PorterAppEvent().ReadDeployEventByAppRevisionID(ctx, appID, appRevisionID)
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error finding matching deploy event")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: false})
	} else {
		revision, ok := updatedStatusMetadata["revision"]
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "revision not found in request metadata")
			return types.PorterAppEvent{}
		}
		revisionFloat64, ok := revision.(float64)
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "revision not a float64")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "revision", Value: revisionFloat64})

		podName, ok := updatedStatusMetadata["pod_name"]
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "pod name not found in request metadata")
			return types.PorterAppEvent{}
		}
		podNameStr, ok := podName.(string)
		if !ok {
			_ = telemetry.Error(ctx, span, nil, "pod name not a string")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-name", Value: podNameStr})

		serviceName = getServiceNameFromPodName(podNameStr, appName)
		if serviceName == "" {
			_ = telemetry.Error(ctx, span, nil, "service name not found in pod name")
			return types.PorterAppEvent{}
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: serviceName})

		var err error
		matchEvent, err = p.Repo().PorterAppEvent().ReadDeployEventByRevision(ctx, appID, revisionFloat64)
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error finding matching deploy event")
			return types.PorterAppEvent{}
		}

		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: false})
	}

	newStatus, ok := updatedStatusMetadata["deploy_status"]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "deploy status not found in request metadata")
		return types.PorterAppEvent{}
	}
	newStatusStr, ok := newStatus.(string)
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "deploy status not a string")
		return types.PorterAppEvent{}
	}
	var porterAppEventStatus types.PorterAppEventStatus
	switch newStatusStr {
	case string(types.PorterAppEventStatus_Success):
		porterAppEventStatus = types.PorterAppEventStatus_Success
	case string(types.PorterAppEventStatus_Failed):
		porterAppEventStatus = types.PorterAppEventStatus_Failed
	case string(types.PorterAppEventStatus_Progressing):
		porterAppEventStatus = types.PorterAppEventStatus_Progressing
	default:
		_ = telemetry.Error(ctx, span, nil, "deploy status not valid")
		return types.PorterAppEvent{}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "new-status", Value: string(porterAppEventStatus)})

	// first check to see if the event is empty, meaning there was no match found, or not progressing, meaning it has already been updated
	if matchEvent.ID == uuid.Nil || matchEvent.Status != string(types.PorterAppEventStatus_Progressing) {
		return types.PorterAppEvent{}
	}

	serviceStatus, ok := matchEvent.Metadata["service_deployment_metadata"]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service deployment metadata not found in deploy event metadata")
		return types.PorterAppEvent{}
	}
	serviceDeploymentGenericMap, ok := serviceStatus.(map[string]interface{})
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service deployment metadata is not map[string]interface{}")
		return types.PorterAppEvent{}
	}
	serviceDeploymentMap := make(map[string]types.ServiceDeploymentMetadata)
	for k, v := range serviceDeploymentGenericMap {
		by, err := json.Marshal(v)
		if err != nil {
			_ = telemetry.Error(ctx, span, nil, "unable to marshal")
			return types.PorterAppEvent{}
		}

		var serviceDeploymentMetadata types.ServiceDeploymentMetadata
		err = json.Unmarshal(by, &serviceDeploymentMetadata)
		if err != nil {
			_ = telemetry.Error(ctx, span, nil, "unable to unmarshal")
			return types.PorterAppEvent{}
		}
		serviceDeploymentMap[k] = serviceDeploymentMetadata
	}
	serviceDeploymentMetadata, ok := serviceDeploymentMap[serviceName]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "deployment metadata not found for service")
		return types.PorterAppEvent{}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-status", Value: serviceDeploymentMetadata.Status})

	// only update service status if it has not been updated yet
	if serviceDeploymentMetadata.Status == types.PorterAppEventStatus_Progressing {
		// update the map with the new status
		serviceDeploymentMetadata.Status = porterAppEventStatus
		serviceDeploymentMap[serviceName] = serviceDeploymentMetadata

		// update the deploy event with new map and status if all services are done
		// note: this assumes that all services are reported 'done' sequentially
		// if two service statuses are updated at the same time, we might miss updating the parent deploy event
		matchEvent.Metadata["service_deployment_metadata"] = serviceDeploymentMap
		allServicesDone := true
		anyServicesFailed := false
		for _, deploymentMetadata := range serviceDeploymentMap {
			if deploymentMetadata.Status == types.PorterAppEventStatus_Progressing {
				allServicesDone = false
				break
			}
			if deploymentMetadata.Status == types.PorterAppEventStatus_Failed {
				anyServicesFailed = true
			}
		}
		if allServicesDone {
			matchEvent.Metadata["end_time"] = time.Now().UTC()
			if anyServicesFailed {
				matchEvent.Status = string(types.PorterAppEventStatus_Failed)
			} else {
				matchEvent.Status = string(types.PorterAppEventStatus_Success)
			}
		}

		err := p.Repo().PorterAppEvent().UpdateEvent(ctx, &matchEvent)
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error updating deploy event")
			return matchEvent.ToPorterAppEvent()
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: true})
		return matchEvent.ToPorterAppEvent()
	}

	return types.PorterAppEvent{}
}

func getServiceNameFromPodName(podName, porterAppName string) string {
	prefix := porterAppName + "-"
	if !strings.HasPrefix(podName, prefix) {
		return ""
	}

	podName = strings.TrimPrefix(podName, prefix)
	suffixes := []string{"-web", "-wkr", "-job"}
	index := -1

	for _, suffix := range suffixes {
		newIndex := strings.LastIndex(podName, suffix)
		if newIndex > index {
			index = newIndex
		}
	}

	if index != -1 {
		return podName[:index]
	}

	// if the suffix wasn't found, it's possible that the service name was too long to keep the entire suffix. example: postgres-snowflake-connector-postgres-snowflake-service-wk8gnst
	// if this is the case, find the service name by removing everything after the last dash
	index = strings.LastIndex(podName, "-")
	if index != -1 {
		return podName[:index]
	}

	return ""
}

// appEventMatchesDetail checks if the app event metadata matches the detail string, returning true if so
// also returns the app event metadata as a defined struct, rather than a generic map
func appEventMatchesDetail(eventMetadata map[string]any, detail string) (*types.PorterAppAppEventMetadata, bool) {
	appEventMetadata := &types.PorterAppAppEventMetadata{}

	by, err := json.Marshal(eventMetadata)
	if err != nil {
		return appEventMetadata, false
	}

	err = json.Unmarshal(by, appEventMetadata)
	if err != nil {
		return appEventMetadata, false
	}

	if appEventMetadata.AppRevisionID == "" {
		return appEventMetadata, false
	}
	if appEventMetadata.ServiceName == "" {
		return appEventMetadata, false
	}
	if !strings.Contains(appEventMetadata.Detail, detail) {
		return appEventMetadata, false
	}

	return appEventMetadata, true
}

// updateDeployEventMatchingAppEventDetails updates the deploy event and service specified by the app event metadata, if it exists
func (p *CreateUpdatePorterAppEventHandler) updateDeployEventMatchingAppEventDetails(
	ctx context.Context,
	porterAppName string,
	porterAppId uint,
	deploymentTargetID string,
	updateMetadata *types.PorterAppAppEventMetadata,
	status types.PorterAppEventStatus,
) error {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event-matching-app-event-details")
	defer span.End()

	if updateMetadata == nil {
		return telemetry.Error(ctx, span, nil, "update metadata is nil")
	}

	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: porterAppName},
		telemetry.AttributeKV{Key: "porter-app-id", Value: porterAppId},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
		telemetry.AttributeKV{Key: "app-revision-id", Value: updateMetadata.AppRevisionID},
		telemetry.AttributeKV{Key: "service-name", Value: updateMetadata.ServiceName},
		telemetry.AttributeKV{Key: "detail", Value: updateMetadata.Detail},
	)

	// convert the metadata to a map[string]interface{} because that is the type updateDeployEvent expects
	// TODO: refactor updateDeployEvent so we don't have to do this
	updateMetadataBytes, err := json.Marshal(updateMetadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error marshaling update metadata")
	}
	updateMetadataMap := make(map[string]interface{})
	err = json.Unmarshal(updateMetadataBytes, &updateMetadataMap)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error unmarshaling update metadata")
	}

	updateMetadataMap["deploy_status"] = string(status)
	// we do not need the returned updated event
	_ = p.updateDeployEvent(ctx, porterAppName, porterAppId, deploymentTargetID, updateMetadataMap)
	return nil
}

// handleNotification handles all logic for notifications in app v2
func (p *CreateUpdatePorterAppEventHandler) handleNotification(ctx context.Context,
	request *types.CreateOrUpdatePorterAppEventRequest,
	projectId, clusterId uint,
	agent *kubernetes.Agent,
) error {
	ctx, span := telemetry.NewSpan(ctx, "serve-handle-notification")
	defer span.End()

	// get the namespace associated with the deployment target id
	deploymentTarget, err := deployment_target.DeploymentTargetDetails(ctx, deployment_target.DeploymentTargetDetailsInput{
		ProjectID:          int64(projectId),
		ClusterID:          int64(clusterId),
		DeploymentTargetID: request.DeploymentTargetID,
		CCPClient:          p.Config().ClusterControlPlaneClient,
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "error getting deployment target details")
	}

	inp := notifications.HandleNotificationInput{
		RawAgentEventMetadata: request.Metadata,
		EventRepo:             p.Repo().PorterAppEvent(),
		DeploymentTargetID:    request.DeploymentTargetID,
		Namespace:             deploymentTarget.Namespace,
		K8sAgent:              agent,
	}

	err = notifications.HandleNotification(ctx, inp)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error handling notification")
	}

	return nil
}
