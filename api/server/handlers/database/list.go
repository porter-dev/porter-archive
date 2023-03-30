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

type DatabaseListHandler struct {
	handlers.PorterHandlerWriter
}

func NewDatabaseListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *DatabaseListHandler {
	return &DatabaseListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *DatabaseListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	// read all clusters for this project
	dbs, err := p.Repo().Database().ListDatabases(proj.ID, cluster.ID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make(types.ListDatabaseResponse, len(dbs))

	for i, db := range dbs {
		res[i] = db.ToDatabaseType()
	}

	p.WriteResult(w, r, res)
}
