package porter_app

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

type PorterAppEventListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppEventListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppEventListHandler {
	return &PorterAppEventListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppEventListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-porter-app-events")
	defer span.End()

	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)
	user, _ := ctx.Value(types.UserScope).(*models.User)
	project, _ := ctx.Value(types.ProjectScope).(*models.Project)

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		e := telemetry.Error(ctx, span, nil, "error parsing stack name from url")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	pr := types.PaginationRequest{}
	d := schema.NewDecoder()
	err := d.Decode(&pr, r.URL.Query())
	if err != nil {
		e := telemetry.Error(ctx, span, nil, "error decoding request")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
		return
	}

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterAppEvents, paginatedResult, err := p.Repo().PorterAppEvent().ListEventsByPorterAppID(ctx, app.ID, helpers.WithPageSize(20), helpers.WithPage(int(pr.Page)))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			e := telemetry.Error(ctx, span, nil, "error listing porter app events by porter app id")
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
			return
		}
	}

	for idx, appEvent := range porterAppEvents {
		if appEvent.Status == "PROGRESSING" {
			pae, err := p.updateExistingAppEvent(ctx, *cluster, stackName, *appEvent, user, project)
			if err != nil {
				e := telemetry.Error(ctx, span, nil, "unable to update existing porter app event")
				p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(e, http.StatusBadRequest))
				return
			}
			porterAppEvents[idx] = &pae
		}
	}

	res := struct {
		Events []types.PorterAppEvent `json:"events"`
		types.PaginationResponse
	}{
		PaginationResponse: types.PaginationResponse(paginatedResult),
	}
	res.Events = make([]types.PorterAppEvent, 0)

	for _, porterApp := range porterAppEvents {
		if porterApp == nil {
			continue
		}
		pa := porterApp.ToPorterAppEvent()
		res.Events = append(res.Events, pa)
	}
	p.WriteResult(w, r, res)
}

func (p *PorterAppEventListHandler) updateExistingAppEvent(
	ctx context.Context,
	cluster models.Cluster,
	stackName string,
	appEvent models.PorterAppEvent,
	user *models.User,
	project *models.Project,
) (models.PorterAppEvent, error) {
	ctx, span := telemetry.NewSpan(ctx, "update-porter-app-event")
	defer span.End()

	if appEvent.ID == uuid.Nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event id is nil when updating")
	}

	event, err := p.Repo().PorterAppEvent().ReadEvent(ctx, appEvent.ID)
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error retrieving porter app by name for cluster")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "porter-app-id", Value: event.PorterAppID},
		telemetry.AttributeKV{Key: "porter-app-event-id", Value: event.ID.String()},
		telemetry.AttributeKV{Key: "porter-app-event-status", Value: event.Status},
		telemetry.AttributeKV{Key: "cluster-id", Value: int(cluster.ID)},
		telemetry.AttributeKV{Key: "project-id", Value: int(cluster.ProjectID)},
	)

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "porter-app-event-updated-status", Value: event.Status})

	err = p.Repo().PorterAppEvent().UpdateEvent(ctx, &event)
	if err != nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	if event.ID == uuid.Nil {
		return models.PorterAppEvent{}, telemetry.Error(ctx, span, nil, "porter app event not found")
	}

	return event, nil
}
