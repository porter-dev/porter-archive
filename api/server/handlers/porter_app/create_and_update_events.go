package porter_app

import (
	"context"
	"net/http"

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
		e := telemetry.Error(ctx, span, err, "error creating new app event")
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
