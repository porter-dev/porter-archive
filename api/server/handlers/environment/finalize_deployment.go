package environment

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
)

type FinalizeDeploymentHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewFinalizeDeploymentHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *FinalizeDeploymentHandler {
	return &FinalizeDeploymentHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *FinalizeDeploymentHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ga, _ := r.Context().Value(types.GitInstallationScope).(*integrations.GithubAppInstallation)
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	request := &types.FinalizeDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// read the environment to get the environment id
	env, err := c.Repo().Environment().ReadEnvironment(project.ID, cluster.ID, uint(ga.InstallationID), owner, name)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// read the deployment
	depl, err := c.Repo().Environment().ReadDeployment(env.ID, request.Namespace)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	depl.Subdomain = request.Subdomain
	depl.Status = types.DeploymentStatusCreated

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

	workflowRun, err := commonutils.GetLatestWorkflowRun(client, depl.RepoOwner, depl.RepoName,
		fmt.Sprintf("porter_%s_env.yml", env.Name), depl.PRBranchFrom)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if depl.Subdomain == "" {
		depl.Subdomain = "*Ingress is disabled for this deployment*"
	}

	// write comment in PR
	commentBody := fmt.Sprintf(
		"## ✅ Porter Preview Environments\n"+
			"||Deployment Information|\n"+
			"|-|-|\n"+
			"| Latest SHA | [`%s`](https://github.com/%s/%s/commit/%s) |\n"+
			"| Live URL | %s |\n"+
			"| Github Action | %s |\n"+
			"| Porter Deployments URL | %s/preview-environments/details/%s?environment_id=%d |",
		depl.CommitSHA, depl.RepoOwner, depl.RepoName, depl.CommitSHA, depl.Subdomain, workflowRun.GetHTMLURL(),
		c.Config().ServerConf.ServerURL, depl.Namespace, depl.EnvironmentID,
	)

	prComment := &github.IssueComment{
		Body: github.String(commentBody),
	}

	_, _, err = client.Issues.CreateComment(
		context.Background(),
		env.GitRepoOwner,
		env.GitRepoName,
		int(depl.PullRequestID),
		prComment,
	)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, depl.ToDeploymentType())
}
