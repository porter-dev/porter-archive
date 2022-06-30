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
	"github.com/porter-dev/porter/api/server/shared/commonutils"
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

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	request := &types.CreateDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID), owner, name)

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

	// add a check for Github PR status
	prClosed, err := isGithubPRClosed(client, owner, name, int(request.PullRequestID))

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error fetching details of github PR. Error: %w", err), http.StatusConflict,
		))
		return
	}

	if prClosed {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("Github PR has been closed"),
			http.StatusConflict))
		return
	}

	ghDeployment, err := createDeployment(client, env, request.PRBranchFrom, request.ActionID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
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

func createDeployment(
	client *github.Client,
	env *models.Environment,
	branchFrom string,
	actionID uint,
) (*github.Deployment, error) {
	requiredContexts := []string{}

	deploymentRequest := github.DeploymentRequest{
		Ref:              github.String(branchFrom),
		Environment:      github.String(env.Name),
		AutoMerge:        github.Bool(false),
		RequiredContexts: &requiredContexts,
	}

	deployment, _, err := client.Repositories.CreateDeployment(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		&deploymentRequest,
	)

	if err != nil {
		return nil, err
	}

	depID := deployment.GetID()

	// Create Deployment Status to indicate it's in progress

	state := "in_progress"
	log_url := fmt.Sprintf("https://github.com/%s/%s/actions/runs/%d", env.GitRepoOwner, env.GitRepoName, actionID)

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
		return nil, err
	}

	return deployment, nil
}
