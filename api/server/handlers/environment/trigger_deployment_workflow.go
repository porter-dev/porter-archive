package environment

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/google/go-github/v41/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

var ErrNoWorkflowRuns = errors.New("no previous workflow runs found")

type TriggerDeploymentWorkflowHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewTriggerDeploymentWorkflowHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *TriggerDeploymentWorkflowHandler {
	return &TriggerDeploymentWorkflowHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *TriggerDeploymentWorkflowHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	deplID, reqErr := requestutils.GetURLParamUint(r, "deployment_id")

	if reqErr != nil {
		c.HandleAPIError(w, r, reqErr)
		return
	}

	depl, err := c.Repo().Environment().ReadDeploymentByID(project.ID, cluster.ID, deplID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if depl.Status == types.DeploymentStatusInactive {
		return
	}

	env, err := c.Repo().Environment().ReadEnvironmentByID(project.ID, cluster.ID, depl.EnvironmentID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	client, err := getGithubClientFromEnvironment(c.Config(), env)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	latestWorkflowRun, err := getLatestWorkflowRun(client, env.GitRepoOwner, env.GitRepoName,
		fmt.Sprintf("porter_%s_env.yml", env.Name), depl.PRBranchFrom)

	if err != nil && errors.Is(err, ErrNoWorkflowRuns) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 400))
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if latestWorkflowRun.GetStatus() == "in_progress" || latestWorkflowRun.GetStatus() == "queued" {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("workflow already in progress"), 409))
		return
	}

	ghResp, err := client.Actions.CreateWorkflowDispatchEventByFileName(
		r.Context(), env.GitRepoOwner, env.GitRepoName, fmt.Sprintf("porter_%s_env.yml", env.Name),
		github.CreateWorkflowDispatchEventRequest{
			Ref: depl.PRBranchFrom,
			Inputs: map[string]interface{}{
				"pr_number":      strconv.FormatUint(uint64(depl.PullRequestID), 10),
				"pr_title":       depl.PRName,
				"pr_branch_from": depl.PRBranchFrom,
				"pr_branch_into": depl.PRBranchInto,
			},
		},
	)

	if ghResp != nil && ghResp.StatusCode == 404 {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("workflow file not found"), 404))
		return
	}

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// set the status to updating manually here for the frontend to case on
	depl.Status = types.DeploymentStatusUpdating

	_, err = c.Repo().Environment().UpdateDeployment(depl)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
}

func getLatestWorkflowRun(client *github.Client, owner, repo, filename, branch string) (*github.WorkflowRun, error) {
	workflowRuns, _, err := client.Actions.ListWorkflowRunsByFileName(
		context.Background(), owner, repo, filename, &github.ListWorkflowRunsOptions{
			Branch: branch,
			ListOptions: github.ListOptions{
				Page:    1,
				PerPage: 1,
			},
		},
	)

	if err != nil {
		return nil, err
	}

	if workflowRuns.GetTotalCount() == 0 {
		return nil, ErrNoWorkflowRuns
	}

	return workflowRuns.WorkflowRuns[0], nil
}
