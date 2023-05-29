package stacks

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
		e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	if request.ID == "" {
		event, err := p.createNewAppEvent(ctx, *cluster, stackName, request.Status, string(request.Type), request.TypeExternalSource, request.Metadata)
		if err != nil {
			e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
		p.WriteResult(w, r, event)
		return
	}
	porterAppEventID, err := uuid.Parse(request.ID)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "invalid UUID supplied as event ID")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	event, err := p.updateExistingAppEvent(ctx, *cluster, stackName, porterAppEventID)
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}
	p.WriteResult(w, r, event)
	return
}

func (p *CreateUpdatePorterAppEventHandler) createNewAppEvent(ctx context.Context, cluster models.Cluster, stackName string, status string, eventType string, externalSource string, requestMetadata map[string]any) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-porter-app-event")
	defer span.End()

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving porter app by name for cluster")
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "stack-app-name", Value: stackName},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

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

func (p *CreateUpdatePorterAppEventHandler) updateExistingAppEvent(ctx context.Context, cluster models.Cluster, stackName string, id uuid.UUID) (types.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	event, err := p.Repo().PorterAppEvent().ReadEvent(ctx, id)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "error retrieving porter app by name for cluster")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: event.PorterAppID},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &event)
	if err != nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return types.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event.ToPorterAppEvent(), nil
}
