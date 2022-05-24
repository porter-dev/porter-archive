package commonutils

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/google/go-github/v41/github"
)

var ErrNoWorkflowRuns = errors.New("no previous workflow runs found")
var ErrWorkflowNotFound = errors.New("no workflow found, file missing")

func GetLatestWorkflowRun(client *github.Client, owner, repo, filename, branch string) (*github.WorkflowRun, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	workflowRuns, ghResponse, err := client.Actions.ListWorkflowRunsByFileName(
		ctx, owner, repo, filename, &github.ListWorkflowRunsOptions{
			Branch: branch,
			ListOptions: github.ListOptions{
				Page:    1,
				PerPage: 1,
			},
		},
	)

	if ghResponse != nil && ghResponse.StatusCode == http.StatusNotFound {
		return nil, ErrWorkflowNotFound
	}

	if err != nil {
		return nil, err
	}

	if workflowRuns == nil || workflowRuns.GetTotalCount() == 0 {
		return nil, ErrNoWorkflowRuns
	}

	return workflowRuns.WorkflowRuns[0], nil
}
