package environment

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type UpdateDeploymentByClusterHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdateDeploymentByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateDeploymentByClusterHandler {
	return &UpdateDeploymentByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *UpdateDeploymentByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.UpdateDeploymentByClusterRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if request.Namespace == "" && request.PRNumber == 0 && request.PRBranchFrom == "" {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("either namespace, pr_number or pr_branch_from must be present in request body"), http.StatusBadRequest,
		))
		return
	}

	var err error

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironmentByOwnerRepoName(
		project.ID, cluster.ID, request.RepoOwner, request.RepoName,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depl, err := c.Repo().Environment().ReadDeploymentForBranch(
		env.ID, request.RepoOwner, request.RepoName, request.PRBranchFrom,
	)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if depl == nil {
		if request.PRNumber != 0 {
			depl, err = c.Repo().Environment().ReadDeploymentByGitDetails(
				env.ID, request.RepoOwner, request.RepoName, request.PRNumber,
			)

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
	}

	if depl == nil {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(errDeploymentNotFound))
		return
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if !depl.IsBranchDeploy() {
		// add a check for the PR to be open before creating a comment
		prClosed, err := isGithubPRClosed(client, request.RepoOwner, request.RepoName, int(depl.PullRequestID))

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
	}

	ghDeployment, err := createGithubDeployment(client, env, request.PRBranchFrom, request.ActionID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depl.Namespace = request.Namespace
	depl.GHDeploymentID = ghDeployment.GetID()
	depl.CommitSHA = request.CommitSHA

	// update the deployment
	depl, err = c.Repo().Environment().UpdateDeployment(depl)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
