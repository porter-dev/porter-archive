package gitinstallation

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
)

var ErrNoWorkflowRuns = errors.New("no previous workflow runs found")

type RerunWorkflowHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRerunWorkflowHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RerunWorkflowHandler {
	return &RerunWorkflowHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *RerunWorkflowHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	owner, name, ok := GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	filename := r.URL.Query().Get("filename")

	if filename == "" {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("filename query param not set")))
		return
	}

	client, err := GetGithubAppClientFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	latestWorkflowRun, err := getLatestWorkflowRun(client, owner, name, filename)

	if err != nil && errors.Is(err, ErrNoWorkflowRuns) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 400))
		return
	} else if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if latestWorkflowRun.GetStatus() == "in_progress" || latestWorkflowRun.GetStatus() == "queued" {
		w.WriteHeader(409)
		c.WriteResult(w, r, latestWorkflowRun.GetHTMLURL())
		return
	}

	_, err = client.Actions.RerunWorkflowByID(r.Context(), owner, name, latestWorkflowRun.GetID())

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	latestWorkflowRun, err = getLatestWorkflowRun(client, owner, name, filename)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, latestWorkflowRun.GetHTMLURL())
}

func getLatestWorkflowRun(client *github.Client, owner, repo, filename string) (*github.WorkflowRun, error) {
	workflowRuns, _, err := client.Actions.ListWorkflowRunsByFileName(
		context.Background(), owner, repo, filename, &github.ListWorkflowRunsOptions{},
	)

	if err != nil {
		return nil, err
	}

	if workflowRuns.GetTotalCount() == 0 {
		return nil, ErrNoWorkflowRuns
	}

	return workflowRuns.WorkflowRuns[0], nil
}
