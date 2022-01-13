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

type ListEnvironmentHandler struct {
	handlers.PorterHandlerWriter
}

func NewListEnvironmentHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListEnvironmentHandler {
	return &ListEnvironmentHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envs, err := c.Repo().Environment().ListEnvironments(project.ID, cluster.ID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Environment, 0)

	for _, env := range envs {
		res = append(res, env.ToEnvironmentType())
	}

	c.WriteResult(w, r, res)
}
