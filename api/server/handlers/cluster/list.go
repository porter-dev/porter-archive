package cluster

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ClusterListHandler struct {
	handlers.PorterHandlerWriter
}

func NewClusterListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ClusterListHandler {
	return &ClusterListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ClusterListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the project from context
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	// read all clusters for this project
	clusters, err := p.Repo().Cluster().ListClustersByProjectID(proj.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Cluster, len(clusters))

	for i, cluster := range clusters {
		res[i] = cluster.ToClusterType()
	}

	p.WriteResult(w, r, res)
}
