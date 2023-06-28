package porter_app

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type GetPorterAppEventHandler struct {
	handlers.PorterHandlerWriter
}

func NewGetPorterAppEventHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetPorterAppEventHandler {
	return &GetPorterAppEventHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *GetPorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-porter-app-event")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	eventId, reqErr := requestutils.GetURLParamString(r, types.URLParamPorterAppEventID)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing event id from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	submittedEventID, err := uuid.Parse(eventId)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error parsing porter app event id as uuid")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	event, err := p.Repo().PorterAppEvent().ReadEvent(ctx, submittedEventID)
	if err != nil {
		e := telemetry.Error(ctx, span, err, "error retrieving porter app event")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	res := struct {
		Event types.PorterAppEvent `json:"event"`
	}{
		Event: event.ToPorterAppEvent(),
	}
	p.WriteResult(w, r, res)
}
