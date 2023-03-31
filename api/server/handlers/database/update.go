package database

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type DatabaseUpdateStatusHandler struct {
	handlers.PorterHandlerReader
}

func NewDatabaseUpdateStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) *DatabaseUpdateStatusHandler {
	return &DatabaseUpdateStatusHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

func (p *DatabaseUpdateStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)

	req := &types.UpdateDatabaseStatusRequest{}

	if ok := p.DecodeAndValidate(w, r, req); !ok {
		return
	}

	// read all clusters for this project
	db, err := p.Repo().Database().ReadDatabaseByInfraID(proj.ID, infra.ID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	db.Status = req.Status

	db, err = p.Repo().Database().UpdateDatabase(db)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}
