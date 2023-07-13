package porter_app

import (
	"context"
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
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

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
		telemetry.AttributeKV{Key: "porter-app-event-type-id", Value: request.Type},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: request.Status},
		telemetry.AttributeKV{Key: "porter-app-event-external-source", Value: request.TypeExternalSource},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: request.ID},
	)

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
		e := telemetry.Error(ctx, span, err, "error updating existing app event")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	p.WriteResult(w, r, event)
}

// createNewAppEvent will create a new app event for the given porter app name. If the app event is an agent event, then it will be created only if there is no existing event which has the agent ID. In the case that an existing event is found, that will be returned instead
func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, cluster models.Cluster, porterAppName string, status string, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-porter-app-event")
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

	if eventType == string(types.PorterAppEventType_AppEvent) {
		if _, ok := requestMetadata["deploy_status"]; ok {
			// update the deploy event if it exists
			return p.maybeUpdateDeployEvent(ctx, porterAppName, app.ID, requestMetadata), nil
		} else {
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
	}

	event := models.PorterAppEvent{
		ID:                 uuid.New(),
		Status:             status,
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
		existingAppEvent.Status = submittedEvent.Status
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

func (p *CreateUpdatePorterAppEventHandler) maybeUpdateDeployEvent(ctx context.Context, appName string, appID uint, requestMetadata map[string]any) types.PorterAppEvent {
	ctx, span := telemetry.NewSpan(ctx, "update-deploy-event")
	defer span.End()

	revision, ok := requestMetadata["revision"]
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

	podName, ok := requestMetadata["pod_name"]
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

	serviceName := getServiceName(podNameStr, appName)
	if serviceName == "" {
		_ = telemetry.Error(ctx, span, nil, "service name not found in pod name")
		return types.PorterAppEvent{}
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "service-name", Value: serviceName})

	newStatus, ok := requestMetadata["deploy_status"]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "deploy status not found in request metadata")
		return types.PorterAppEvent{}
	}
	newStatusStr, ok := newStatus.(string)
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "deploy status not a string")
		return types.PorterAppEvent{}
	}
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "new-status", Value: newStatusStr})

	matchEvent, err := p.Repo().PorterAppEvent().ReadDeployEventByRevision(ctx, appID, revisionFloat64)
	if err != nil {
		_ = telemetry.Error(ctx, span, err, "error finding matching deploy event")
		return types.PorterAppEvent{}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: false})

	// first check to see if the event is empty, meaning there was no match found
	if matchEvent.ID == uuid.Nil || matchEvent.Status != "PROGRESSING" {
		return types.PorterAppEvent{}
	}

	serviceStatus, ok := matchEvent.Metadata["service_status"]
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service status not found in deploy event metadata")
		return types.PorterAppEvent{}
	}
	serviceStatusMap, ok := serviceStatus.(map[string]interface{})
	if !ok {
		_ = telemetry.Error(ctx, span, nil, "service status not a map[string]interface")
		return types.PorterAppEvent{}
	}
	if _, ok := serviceStatusMap[serviceName]; !ok {
		_ = telemetry.Error(ctx, span, nil, fmt.Sprintf("service status not found for service %s", serviceName))
		return types.PorterAppEvent{}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-status", Value: serviceStatusMap[serviceName]})
	// only update service status if it has not been updated yet
	if serviceStatusMap[serviceName] == "PROGRESSING" {
		serviceStatusMap[serviceName] = newStatusStr

		allServicesDone := true
		anyServicesFailed := false
		for _, status := range serviceStatusMap {
			if status == "PROGRESSING" {
				allServicesDone = false
				break
			}
			if status == "FAILED" {
				anyServicesFailed = true
			}
		}
		if allServicesDone {
			if anyServicesFailed {
				matchEvent.Status = "FAILED"
			} else {
				matchEvent.Status = "SUCCESS"
			}
		}

		matchEvent.Metadata["service_status"] = serviceStatusMap
		err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &matchEvent)
		if err != nil {
			_ = telemetry.Error(ctx, span, err, "error updating deploy event")
			return matchEvent.ToPorterAppEvent()
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "updating-deployment-event", Value: true})
	}

	return types.PorterAppEvent{}
}

func getServiceName(podName, porterAppName string) string {
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
