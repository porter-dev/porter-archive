package environment

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListDeploymentsByClusterHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewListDeploymentsByClusterHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListDeploymentsByClusterHandler {
	return &ListDeploymentsByClusterHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListDeploymentsByClusterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	req := &types.ListDeploymentRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		return
	}

	var deployments []*types.Deployment
	var pullRequests []*types.PullRequest

	if req.EnvironmentID == 0 {
		depls, err := c.Repo().Environment().ListDeploymentsByCluster(project.ID, cluster.ID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		deplInfoMap := make(map[string]bool)

		for _, depl := range depls {
			deployment := depl.ToDeploymentType()
			deplInfoMap[fmt.Sprintf(
				"%s-%s-%d", deployment.RepoOwner, deployment.RepoName, deployment.PullRequestID,
			)] = true

			env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, deployment.EnvironmentID)

			if err == nil {
				updateDeploymentWithGithubWorkflowRunStatus(r.Context(), c.Config(), env, deployment)
			}

			deployments = append(deployments, deployment)
		}

		envList, err := c.Repo().Environment().ListEnvironments(project.ID, cluster.ID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		for _, env := range envList {
			prs, err := fetchOpenPullRequests(r.Context(), c.Config(), env, deplInfoMap)

			if err != nil {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}

			pullRequests = append(pullRequests, prs...)
		}
	} else {
		env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, req.EnvironmentID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		depls, err := c.Repo().Environment().ListDeployments(env.ID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		deplInfoMap := make(map[string]bool)

		for _, depl := range depls {
			deployment := depl.ToDeploymentType()
			deplInfoMap[fmt.Sprintf(
				"%s-%s-%d", deployment.RepoOwner, deployment.RepoName, deployment.PullRequestID,
			)] = true

			updateDeploymentWithGithubWorkflowRunStatus(r.Context(), c.Config(), env, deployment)

			deployments = append(deployments, deployment)
		}

		prs, err := fetchOpenPullRequests(r.Context(), c.Config(), env, deplInfoMap)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		pullRequests = append(pullRequests, prs...)
	}

	c.WriteResult(w, r, map[string]interface{}{
		"pull_requests": pullRequests,
		"deployments":   deployments,
	})
}

func updateDeploymentWithGithubWorkflowRunStatus(
	ctx context.Context,
	config *config.Config,
	env *models.Environment,
	deployment *types.Deployment,
) {
	client, err := getGithubClientFromEnvironment(config, env)

	if err == nil {
		workflowRuns, _, err := client.Actions.ListWorkflowRunsByFileName(
			ctx, deployment.RepoOwner, deployment.RepoName,
			fmt.Sprintf("porter_%s_env.yml", env.Name), &github.ListWorkflowRunsOptions{
				Branch: deployment.PRBranchFrom,
				ListOptions: github.ListOptions{
					Page:    1,
					PerPage: 1,
				},
			},
		)

		if err == nil && workflowRuns.GetTotalCount() > 0 {
			latestWorkflowRun := workflowRuns.WorkflowRuns[0]

			fmt.Println(latestWorkflowRun)

			deployment.LastWorkflowRunURL = latestWorkflowRun.GetHTMLURL()

			if deployment.Status != types.DeploymentStatusCreating &&
				(latestWorkflowRun.GetStatus() == "in_progress" ||
					latestWorkflowRun.GetStatus() == "queued") {
				deployment.Status = types.DeploymentStatusUpdating
			} else if latestWorkflowRun.GetStatus() == "completed" {
				if latestWorkflowRun.GetConclusion() == "failed" {
					deployment.Status = types.DeploymentStatusFailed
				} else if latestWorkflowRun.GetConclusion() == "timed_out" {
					deployment.Status = types.DeploymentStatusTimedOut
				}
			}
		}
	}
}

func fetchOpenPullRequests(
	ctx context.Context,
	config *config.Config,
	env *models.Environment,
	deplInfoMap map[string]bool,
) ([]*types.PullRequest, error) {
	client, err := getGithubClientFromEnvironment(config, env)

	if err != nil {
		return nil, err
	}

	openPRs, resp, err := client.PullRequests.List(ctx, env.GitRepoOwner, env.GitRepoName,
		&github.PullRequestListOptions{
			ListOptions: github.ListOptions{
				PerPage: 100,
			},
		},
	)

	var prs []*types.PullRequest

	if resp != nil && resp.StatusCode == 404 {
		return prs, nil
	}

	if err != nil {
		return nil, err
	}

	var ghPRs []*github.PullRequest

	for resp.NextPage != 0 && err != nil {
		ghPRs, resp, err = client.PullRequests.List(ctx, env.GitRepoOwner, env.GitRepoName,
			&github.PullRequestListOptions{
				ListOptions: github.ListOptions{
					PerPage: 100,
					Page:    resp.NextPage,
				},
			},
		)

		openPRs = append(openPRs, ghPRs...)
	}

	for _, pr := range openPRs {
		if _, ok := deplInfoMap[fmt.Sprintf("%s-%s-%d", env.GitRepoOwner, env.GitRepoName, pr.GetNumber())]; !ok {
			prs = append(prs, &types.PullRequest{
				Title:      pr.GetTitle(),
				Number:     uint(pr.GetNumber()),
				RepoOwner:  env.GitRepoOwner,
				RepoName:   env.GitRepoName,
				BranchFrom: pr.GetHead().GetRef(),
				BranchInto: pr.GetBase().GetRef(),
			})
		}
	}

	return prs, nil
}
