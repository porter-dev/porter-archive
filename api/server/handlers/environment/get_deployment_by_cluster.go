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

type GetDeploymentByClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetDeploymentByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetDeploymentByClusterHandler {
	return &GetDeploymentByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetDeploymentByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.GetDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	depl, err := c.Repo().Environment().ReadDeploymentByCluster(project.ID, cluster.ID, request.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
