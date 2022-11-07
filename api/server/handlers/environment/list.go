package environment

import (
	"fmt"
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
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error listing environments"), http.StatusInternalServerError, err.Error(),
		))
		return
	}

	var res types.ListEnvironmentsResponse

	for _, env := range envs {
		environment := env.ToEnvironmentType()

		depls, err := c.Repo().Environment().ListDeployments(env.ID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("error listing environments: error listing deployments for environment ID %d", env.ID),
				http.StatusInternalServerError, err.Error(),
			))
			return
		}

		environment.DeploymentCount = uint(len(depls))

		if environment.DeploymentCount > 0 {
			environment.LastDeploymentStatus = string(depls[0].Status)
		}

		res = append(res, environment)
	}

	c.WriteResult(w, r, res)
}
