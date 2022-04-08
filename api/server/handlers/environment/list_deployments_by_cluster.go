package environment

import (
	"context"
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

		for _, depl := range depls {
			deployments = append(deployments, depl.ToDeploymentType())
		}

		envList, err := c.Repo().Environment().ListEnvironments(project.ID, cluster.ID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		for _, env := range envList {
			prs, err := populateOpenPullRequests(r.Context(), c.Config(), env)

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

		for _, depl := range depls {
			deployments = append(deployments, depl.ToDeploymentType())
		}

		env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, req.EnvironmentID)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		prs, err := populateOpenPullRequests(r.Context(), c.Config(), env)

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

func populateOpenPullRequests(
	ctx context.Context,
	config *config.Config,
	env *models.Environment,
) ([]*types.PullRequest, error) {
	client, err := getGithubClientFromEnvironment(config, env)

	if err != nil {
		return nil, err
	}

	openPRs, _, err := client.PullRequests.List(ctx, env.GitRepoOwner, env.GitRepoName,
		&github.PullRequestListOptions{
			ListOptions: github.ListOptions{
				PerPage: 50,
			},
		},
	)

	if err != nil {
		return nil, err
	}

	var prs []*types.PullRequest

	for _, pr := range openPRs {
		prs = append(prs, &types.PullRequest{
			Title:      pr.GetTitle(),
			Number:     uint(pr.GetNumber()),
			RepoOwner:  pr.GetHead().GetRepo().GetOwner().GetName(),
			RepoName:   pr.GetHead().GetRepo().GetName(),
			BranchFrom: pr.GetHead().GetRef(),
			BranchInto: pr.GetBase().GetRef(),
		})
	}

	return prs, nil
}
