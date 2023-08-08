package porter_app

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
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

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, reqErr, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-name", Value: stackName},
		telemetry.AttributeKV{Key: "porter-app-event-type", Value: string(request.Type)},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: request.Status},
		telemetry.AttributeKV{Key: "porter-app-event-external-source", Value: request.TypeExternalSource},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: request.ID},
	)

	if request.Type == types.PorterAppEventType_Build {
		reportBuildStatus(ctx, request, p.Config(), user, project, stackName)
	}

	if request.ID == "" {
		event, err := p.createNewAppEvent(ctx, *cluster, stackName, request.Status, string(request.Type), request.TypeExternalSource, request.Metadata)
		if err != nil {
			e := telemetry.Error(ctx, span, err, "error creating new app event")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		p.WriteResult(w, r, event)
		return
	}

	event, err := p.updateExistingAppEvent(ctx, *cluster, stackName, *request)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error creating new app event")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	p.WriteResult(w, r, event)
}

func reportBuildStatus(ctx context.Context, request *types.CreateOrUpdatePorterAppEventRequest, config *config.Config, user *models.User, project *models.Project, stackName string) {
	ctx, span := telemetry.NewSpan(ctx, "report-build-status")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-build-status", Value: request.Status})

	var errStr string
	if errors, ok := request.Metadata["errors"]; ok {
		if errs, ok := errors.(map[string]interface{}); ok {
			errStringMap := make(map[string]string)
			for k, v := range errs {
				if valueStr, ok := v.(string); ok {
					errStringMap[k] = valueStr
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

	_ = TrackStackBuildStatus(config, user, project, stackName, errStr, request.Status)
}

// createNewAppEvent will create a new app event for the given porter app name. If the app event is an agent event, then it will be created only if there is no existing event which has the agent ID. In the case that an existing event is found, that will be returned instead
func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, cluster models.Cluster, porterAppName string, status types.PorterAppEventStatus, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
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
			existingEvents, _, err := p.Repo().PorterAppEvent().ListEventsByPorterAppID(ctx, app.ID)
			if err != nil {
				return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error listing porter app events for event type")
			}

			for _, existingEvent := range existingEvents {
				if existingEvent.Type == eventType {
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
			return p.updateDeployEvent(ctx, porterAppName, app.ID, requestMetadata), nil
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
func (p *CreateUpdatePorterAppEventHandler) updateDeployEvent(ctx context.Context, appName string, appID uint, updatedStatusMetadata map[string]any) types.PorterAppEvent {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event")
	defer span.End()

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

	serviceName := getServiceNameFromPodName(podNameStr, appName)
	if serviceName == "" {
		_ = telemetry.Error(ctx, span, nil, "service name not found in pod name")
		return types.PorterAppEvent{}
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: serviceName})

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

	matchEvent, err := p.Repo().PorterAppEvent().ReadDeployEventByRevision(ctx, appID, revisionFloat64)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error finding matching deploy event")
		return types.PorterAppEvent{}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: false})

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
			if anyServicesFailed {
				matchEvent.Status = string(types.PorterAppEventStatus_Failed)
			} else {
				matchEvent.Status = string(types.PorterAppEventStatus_Success)
			}
		}

		err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &matchEvent)
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

	return ""
}
