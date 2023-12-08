package porter_app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/google/uuid"
	porterv1 "github.com/porter-dev/api-contracts/generated/go/porter/v1"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
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

	var event types.PorterAppEvent
	var err error
	if request.ID == "" { // no event id provided, so create a new event/notification
		// This branch will only be hit for v2 app_event type events
		if request.DeploymentTargetID != "" && request.Type == types.PorterAppEventType_AppEvent {
			err := p.handleNotification(ctx, request, project.ID, cluster.ID) // no event will be returned when a notification is handled
			if err != nil {
				e := telemetry.Error(ctx, span, err, "error handling notification")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusInternalServerError))
				return
			}
		} else {
			event, err = p.createNewAppEvent(ctx, *project, *cluster, appName, request.DeploymentTargetID, request.Status, string(request.Type), request.TypeExternalSource, request.Metadata)
			if err != nil {
				e := telemetry.Error(ctx, span, err, "error creating new app event")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
				return
			}
		}
	} else { // event id provided, so update an existing event matching that event
		event, err = p.updateExistingAppEvent(ctx, *cluster, appName, *request)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error creating new app event")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
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
func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, project models.Project, cluster models.Cluster, porterAppName string, deploymentTargetID string, status types.PorterAppEventStatus, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
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

	// this branch can be safely removed once v1 is deprecated
	if eventType == string(types.PorterAppEventType_AppEvent) {
		// Agent has no way to know what the porter app event id is, so if we must dedup here
		if agentEventID, ok := requestMetadata["agent_event_id"]; ok {
			var existingEvents []*models.PorterAppEvent
			existingEvents, _, err = p.Repo().PorterAppEvent().ListEventsByPorterAppID(ctx, app.ID)
			if err != nil {
				return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error listing porter app events for event type")
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
	}

	if eventType == string(types.PorterAppEventType_Deploy) {
		// Agent has no way to know what the porter app event id is, so update the deploy event if it exists
		if _, ok := requestMetadata["deploy_status"]; ok {
			if deploymentTargetID == "" {
				event, err := p.updateDeployEventV1(ctx, porterAppName, app.ID, requestMetadata)
				if err != nil {
					return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error updating v1 deploy event")
				}
				return event, nil
			} else {
				betaFeaturesEnabled := project.GetFeatureFlag(models.BetaFeaturesEnabled, p.Config().LaunchDarklyClient)
				telemetry.WithAttributes(span,
					telemetry.AttributeKV{Key: "beta_features_enabled", Value: betaFeaturesEnabled},
				)
				// if beta features are not enabled, then porter makes a request to ccp to update the deploy status
				// if beta features are enabled, ccp is checking the deploy status, so this request is not necessary
				// TODO remove this entire branch once beta features are enabled by default
				if !betaFeaturesEnabled {
					err := p.updateDeployEventV2(ctx, updateDeployEventV2Input{
						projectID:             cluster.ProjectID,
						appName:               porterAppName,
						appID:                 app.ID,
						deploymentTargetID:    deploymentTargetID,
						updatedStatusMetadata: requestMetadata,
					})
					if err != nil {
						return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error updating v2 deploy event")
					}
				}
				return types.PorterAppEvent{}, nil
			}
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
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "deployment target id cannot be nil")
		}

		// hacky way to get the app instance id into the build event
		revision, err := p.Config().ClusterControlPlaneClient.CurrentAppRevision(ctx, connect.NewRequest(&porterv1.CurrentAppRevisionRequest{
			ProjectId:          int64(cluster.ProjectID),
			AppId:              int64(app.ID),
			DeploymentTargetId: deploymentTargetID,
		}))
		if err != nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error getting current app revision from cluster control plane client")
		}
		if revision.Msg.AppRevision == nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "app revision is nil")
		}

		appInstanceUUID, err := uuid.Parse(revision.Msg.AppRevision.AppInstanceId)
		if err != nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error parsing app instance id")
		}
		if appInstanceUUID == uuid.Nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "app instance id cannot be nil")
		}

		event.DeploymentTargetID = deploymentTargetUUID
		event.AppInstanceID = appInstanceUUID
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

	telemetry.WithAttributes(span,
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

// updateDeployEventV1 attempts to update the deploy event with the deploy status of each service given in updatedStatusMetadata
// an update is only made in the following cases:
// 1. the deploy event is found
// 2. the deploy event is in the PROGRESSING state
// 3. the deploy event service deployment metadata is formatted correctly
// 4. the services specified in the updatedStatusMetadata match the services in the deploy event metadata
// 5. some of the above services are still in the PROGRESSING state
// if one of these conditions is not met, then an empty event is returned and no update is made; otherwise, the matched event is returned
func (p *CreateUpdatePorterAppEventHandler) updateDeployEventV1(ctx context.Context, appName string, appID uint, updatedStatusMetadata map[string]any) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event")
	defer span.End()

	revision, ok := updatedStatusMetadata["revision"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "revision not found in request metadata")
	}
	revisionFloat64, ok := revision.(float64)
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "revision not a float64")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "revision", Value: revisionFloat64})

	podName, ok := updatedStatusMetadata["pod_name"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "pod name not found in request metadata")
	}
	podNameStr, ok := podName.(string)
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "pod name not a string")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "pod-name", Value: podNameStr})

	serviceName := getServiceNameFromPodName(podNameStr, appName)
	if serviceName == "" {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "service name not found in pod name")
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: serviceName})

	var err error
	matchEvent, err := p.Repo().PorterAppEvent().ReadDeployEventByRevision(ctx, appID, revisionFloat64)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error finding matching deploy event")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: false})

	newStatus, ok := updatedStatusMetadata["deploy_status"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "deploy status not found in request metadata")
	}
	newStatusStr, ok := newStatus.(string)
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "deploy status not a string")
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
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "deploy status not valid")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "new-status", Value: string(porterAppEventStatus)})

	// first check to see if the event is empty, meaning there was no match found, or not progressing, meaning it has already been updated
	if matchEvent.ID == uuid.Nil || matchEvent.Status != string(types.PorterAppEventStatus_Progressing) {
		return types.PorterAppEvent{}, nil
	}

	serviceStatus, ok := matchEvent.Metadata["service_deployment_metadata"]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "service deployment metadata not found in deploy event metadata")
	}
	serviceDeploymentGenericMap, ok := serviceStatus.(map[string]interface{})
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "service deployment metadata is not map[string]interface{}")
	}
	serviceDeploymentMap := make(map[string]types.ServiceDeploymentMetadata)
	for k, v := range serviceDeploymentGenericMap {
		by, err := json.Marshal(v)
		if err != nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "unable to marshal")
		}

		var serviceDeploymentMetadata types.ServiceDeploymentMetadata
		err = json.Unmarshal(by, &serviceDeploymentMetadata)
		if err != nil {
			return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "unable to unmarshal")
		}
		serviceDeploymentMap[k] = serviceDeploymentMetadata
	}
	serviceDeploymentMetadata, ok := serviceDeploymentMap[serviceName]
	if !ok {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "deployment metadata not found for service")
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
			return matchEvent.ToPorterAppEvent(), nil
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: true})
		return matchEvent.ToPorterAppEvent(), nil
	}

	return types.PorterAppEvent{}, nil
}

type updateDeployEventV2Input struct {
	projectID             uint
	appName               string
	appID                 uint
	deploymentTargetID    string
	updatedStatusMetadata map[string]any
}

func (p *CreateUpdatePorterAppEventHandler) updateDeployEventV2(
	ctx context.Context,
	inp updateDeployEventV2Input,
) error {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event-v2")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-name", Value: inp.appName},
		telemetry.AttributeKV{Key: "app-id", Value: inp.appID},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: inp.deploymentTargetID},
		telemetry.AttributeKV{Key: "project-id", Value: int(inp.projectID)},
	)

	agentEventMetadata, err := notifications.ParseAgentEventMetadata(inp.updatedStatusMetadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to unmarshal agent event metadata")
	}
	if agentEventMetadata == nil {
		return telemetry.Error(ctx, span, nil, "agent event metadata is nil")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-revision-id", Value: agentEventMetadata.AppRevisionID},
		telemetry.AttributeKV{Key: "service-name", Value: agentEventMetadata.ServiceName},
		telemetry.AttributeKV{Key: "deployment-status", Value: agentEventMetadata.DeployStatus},
	)
	var deploymentStatus porterv1.EnumServiceDeploymentStatus
	switch agentEventMetadata.DeployStatus {
	case types.PorterAppEventStatus_Success:
		deploymentStatus = porterv1.EnumServiceDeploymentStatus_ENUM_SERVICE_DEPLOYMENT_STATUS_SUCCESS
	case types.PorterAppEventStatus_Failed:
		deploymentStatus = porterv1.EnumServiceDeploymentStatus_ENUM_SERVICE_DEPLOYMENT_STATUS_FAILED
	case types.PorterAppEventStatus_Progressing:
		deploymentStatus = porterv1.EnumServiceDeploymentStatus_ENUM_SERVICE_DEPLOYMENT_STATUS_PROGRESSING
	default:
		return telemetry.Error(ctx, span, nil, "deployment status not valid")
	}

	updateRequest := connect.NewRequest(&porterv1.UpdateServiceDeploymentStatusRequest{
		ProjectId: int64(inp.projectID),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: inp.deploymentTargetID,
		},
		AppName:       inp.appName,
		AppRevisionId: agentEventMetadata.AppRevisionID,
		ServiceName:   agentEventMetadata.ServiceName,
		Status:        deploymentStatus,
	})

	_, err = p.Config().ClusterControlPlaneClient.UpdateServiceDeploymentStatus(ctx, updateRequest)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error updating service deployment status")
	}

	return nil
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

// handleNotification handles all logic for notifications in app v2
func (p *CreateUpdatePorterAppEventHandler) handleNotification(ctx context.Context,
	request *types.CreateOrUpdatePorterAppEventRequest,
	projectId, clusterId uint,
) error {
	ctx, span := telemetry.NewSpan(ctx, "serve-handle-notification")
	defer span.End()

	agentEventMetadata, err := notifications.ParseAgentEventMetadata(request.Metadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to unmarshal app event metadata")
	}
	if agentEventMetadata == nil {
		return telemetry.Error(ctx, span, nil, "app event metadata is nil")
	}

	createNotificationRequest := connect.NewRequest(&porterv1.CreateNotificationRequest{
		ProjectId: int64(projectId),
		ClusterId: int64(clusterId),
		DeploymentTargetIdentifier: &porterv1.DeploymentTargetIdentifier{
			Id: request.DeploymentTargetID,
		},
		AppName:            agentEventMetadata.AppName,
		ServiceName:        agentEventMetadata.ServiceName,
		AppRevisionId:      agentEventMetadata.AppRevisionID,
		PorterAgentEventId: int64(agentEventMetadata.AgentEventID),
		RawSummary:         agentEventMetadata.Summary,
		RawDetail:          agentEventMetadata.Detail,
		JobRunId:           agentEventMetadata.JobRunID,
	})

	_, err = p.Config().ClusterControlPlaneClient.CreateNotification(ctx, createNotificationRequest)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating notification")
	}

	return nil
}
