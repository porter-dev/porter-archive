package environment

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type GetDeploymentByEnvironmentHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetDeploymentByEnvironmentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetDeploymentByEnvironmentHandler {
	return &GetDeploymentByEnvironmentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetDeploymentByEnvironmentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	envID, reqErr := requestutils.GetURLParamUint(r, "environment_id")

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	request := &types.GetDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Namespace == "" && request.PRNumber == 0 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("either namespace or pr_number must be present in request body"), http.StatusBadRequest,
		))
		return
	}

	var err error

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, envID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(errEnvironmentNotFound))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var depl *models.Deployment

	// read the deployment
	if request.PRNumber != 0 {
		depl, err = c.Repo().Environment().ReadDeploymentByGitDetails(env.ID, env.GitRepoOwner, env.GitRepoName,
			request.PRNumber)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.HandleAPIError(w, r, apierrors.NewErrNotFound(errDeploymentNotFound))
				return
			}

			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	} else if request.Namespace != "" {
		depl, err = c.Repo().Environment().ReadDeployment(env.ID, request.Namespace)

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.HandleAPIError(w, r, apierrors.NewErrNotFound(errDeploymentNotFound))
				return
			}

			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	if depl == nil {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(errDeploymentNotFound))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
