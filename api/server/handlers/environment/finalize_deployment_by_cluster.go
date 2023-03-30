package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type FinalizeDeploymentByClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewFinalizeDeploymentByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *FinalizeDeploymentByClusterHandler {
	return &FinalizeDeploymentByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *FinalizeDeploymentByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.FinalizeDeploymentByClusterRequest{}

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
	env, err := c.Repo().Environment().ReadEnvironmentByOwnerRepoName(
		project.ID, cluster.ID, request.RepoOwner, request.RepoName,
	)

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

	if depl == nil {
		c.HandleAPIError(w, r, apierrors.NewErrNotFound(errDeploymentNotFound))
		return
	}

	depl.Subdomain = request.Subdomain
	depl.Status = types.DeploymentStatusCreated
	depl.LastErrors = ""

	// update the deployment
	depl, err = c.Repo().Environment().UpdateDeployment(depl)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// Create new deployment status to indicate deployment is ready

	state := "success"
	env_url := depl.Subdomain

	deploymentStatusRequest := github.DeploymentStatusRequest{
		State:          &state,
		EnvironmentURL: &env_url,
	}

	_, _, err = client.Repositories.CreateDeploymentStatus(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		depl.GHDeploymentID,
		&deploymentStatusRequest,
	)

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

		commentBody := "## Porter Preview Environments\n"

		if depl.Subdomain == "" {
			commentBody += fmt.Sprintf(
				"✅ The latest SHA ([`%s`](https://github.com/%s/%s/commit/%s)) has been successfully deployed.",
				depl.CommitSHA, depl.RepoOwner, depl.RepoName, depl.CommitSHA,
			)
		} else {
			commentBody += fmt.Sprintf(
				"✅ The latest SHA ([`%s`](https://github.com/%s/%s/commit/%s)) has been successfully deployed to %s",
				depl.CommitSHA, depl.RepoOwner, depl.RepoName, depl.CommitSHA, depl.Subdomain,
			)
		}

		err = createOrUpdateComment(client, c.Repo(), env.NewCommentsDisabled, depl, github.String(commentBody))

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
