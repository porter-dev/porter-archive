package environment

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

type UpdateDeploymentStatusHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateDeploymentStatusHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateDeploymentStatusHandler {
	return &UpdateDeploymentStatusHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateDeploymentStatusHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	request := &types.UpdateDeploymentStatusRequest{}

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

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID), owner, name)

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
		depl, err = c.Repo().Environment().ReadDeploymentByGitDetails(env.ID, owner, name, request.PRNumber)

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

	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("unable to get github client: %w", err), http.StatusConflict,
		))
		return
	}

	// add a check for the PR to be open before creating a comment
	prClosed, err := isGithubPRClosed(client, depl.RepoOwner, depl.RepoName, int(depl.PullRequestID))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error fetching details of github PR for deployment ID: %d. Error: %w",
				depl.ID, err), http.StatusConflict,
		))
		return
	}

	if prClosed {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("Github PR has been closed"),
			http.StatusConflict))
		return
	}

	if depl.Status == types.DeploymentStatusInactive && request.Status != string(types.DeploymentStatusCreating) {
		// a deployment from "inactive" state can only transition to "creating"
		c.WriteResult(w, r, depl.ToDeploymentType())
		return
	}

	depl.Status = types.DeploymentStatus(request.Status)

	// create the deployment
	depl, err = c.Repo().Environment().UpdateDeployment(depl)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
