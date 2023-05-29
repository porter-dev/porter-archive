package stacks

import (
	"errors"
	"net/http"

	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
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
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	stackName, reqErr := requestutils.GetURLParamString(r, types.URLParamStackName)
	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
		return
	}

	pr := types.PaginationRequest{}
	d := schema.NewDecoder()
	err := d.Decode(&pr, r.URL.Query())
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	app, err := p.Repo().PorterApp().ReadPorterAppByName(cluster.ID, stackName)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	porterApps, paginatedResult, err := p.Repo().PorterAppEvent().ListEventsByPorterAppID(app.ID, helpers.WithPageSize(20), helpers.WithPage(int(pr.Page)))
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(reqErr, http.StatusBadRequest))
			return
		}
	}

	res := struct {
		Events []types.PorterAppEvent `json:"events"`
		types.PaginationResponse
	}{
		PaginationResponse: types.PaginationResponse(paginatedResult),
	}
	res.Events = make([]types.PorterAppEvent, 0)

	for _, porterApp := range porterApps {
		if porterApp == nil {
			continue
		}
		pa := porterApp.ToPorterAppEvent()
		res.Events = append(res.Events, pa)
	}
	p.WriteResult(w, r, res)
}
