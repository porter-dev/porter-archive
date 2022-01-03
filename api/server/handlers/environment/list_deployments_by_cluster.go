package environment

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListDeploymentsByClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewListDeploymentsByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListDeploymentsByClusterHandler {
	return &ListDeploymentsByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListDeploymentsByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	depls, err := c.Repo().Environment().ListDeploymentsByCluster(project.ID, cluster.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Deployment, 0)

	for _, depl := range depls {
		res = append(res, depl.ToDeploymentType())
	}

	c.WriteResult(w, r, res)
}
