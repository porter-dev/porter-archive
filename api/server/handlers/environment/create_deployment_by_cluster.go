package environment

import (
	"context"
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

type CreateDeploymentByClusterHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateDeploymentByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDeploymentByClusterHandler {
	return &CreateDeploymentByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateDeploymentByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironmentByOwnerRepoName(
		project.ID, cluster.ID, request.RepoOwner, request.RepoName,
	)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.HandleAPIError(w, r, apierrors.NewErrNotFound(
				fmt.Errorf("error creating deployment: %w", errEnvironmentNotFound)),
			)
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// add a check for Github PR status
	prClosed, err := isGithubPRClosed(client, request.RepoOwner, request.RepoName, int(request.PullRequestID))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
		return
	}

	if prClosed {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("attempting to create deployment for a closed github PR"), http.StatusConflict,
		))
		return
	}

	ghDeployment, err := createGithubDeployment(client, env, request.PRBranchFrom, request.ActionID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusConflict))
		return
	}

	// create the deployment
	depl, err := c.Repo().Environment().CreateDeployment(&models.Deployment{
		EnvironmentID:  env.ID,
		Namespace:      request.Namespace,
		Status:         types.DeploymentStatusCreating,
		PullRequestID:  request.PullRequestID,
		GHDeploymentID: ghDeployment.GetID(),
		RepoOwner:      request.GitHubMetadata.RepoOwner,
		RepoName:       request.GitHubMetadata.RepoName,
		PRName:         request.GitHubMetadata.PRName,
		CommitSHA:      request.GitHubMetadata.CommitSHA,
		PRBranchFrom:   request.GitHubMetadata.PRBranchFrom,
		PRBranchInto:   request.GitHubMetadata.PRBranchInto,
	})

	if err != nil {
		// try to delete the GitHub deployment
		_, err = client.Repositories.DeleteDeployment(
			context.Background(),
			env.GitRepoOwner,
			env.GitRepoName,
			ghDeployment.GetID(),
		)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("%v: %w", errGithubAPI, err),
				http.StatusConflict))
			return
		}

		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating deployment: %w", err)))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
