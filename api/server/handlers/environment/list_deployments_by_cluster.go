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
		depls, err := c.Repo().Environment().ListDeployments(req.EnvironmentID)

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
			deployments = append(deployments, deployment)
		}

		env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, req.EnvironmentID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
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
				PerPage: 50,
			},
		},
	)

	var prs []*types.PullRequest

	if resp.StatusCode == 404 {
		return prs, nil
	}

	if err != nil {
		return nil, err
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
