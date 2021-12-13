package environment

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type CreateDeploymentHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateDeploymentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateDeploymentHandler {
	return &CreateDeploymentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateDeploymentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create deployment on GitHub API
	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	branch := request.Branch
	envName := "Preview"
	automerge := false
	requiredContexts := []string{}

	deploymentRequest := github.DeploymentRequest{
		Ref:              &branch,
		Environment:      &envName,
		AutoMerge:        &automerge,
		RequiredContexts: &requiredContexts,
	}

	deployment, _, err := client.Repositories.CreateDeployment(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		&deploymentRequest,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depID := deployment.GetID()

	// Create Deployment Status to indicate it's in progress

	state := "in_progress"
	log_url := fmt.Sprintf("https://github.com/%s/%s/actions/%d", env.GitRepoOwner, env.GitRepoName, request.ActionID)

	deploymentStatusRequest := github.DeploymentStatusRequest{
		State:  &state,
		LogURL: &log_url, // link to actions tab
	}

	_, _, err = client.Repositories.CreateDeploymentStatus(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		depID,
		&deploymentStatusRequest,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create the deployment
	depl, err := c.Repo().Environment().CreateDeployment(&models.Deployment{
		EnvironmentID:      env.ID,
		Namespace:          request.Namespace,
		Status:             "creating",
		PullRequestID:      request.PullRequestID,
		GitHubDeploymentID: depID,
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// create the backing namespace
	agent, err := c.GetAgent(r, cluster, "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	_, err = agent.CreateNamespace(depl.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
