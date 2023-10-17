package gitinstallation

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
)

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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-rerun-github-workflow")
	defer span.End()

	owner, reqErr := requestutils.GetURLParamString(r, types.URLParamGitRepoOwner)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "repo owner not found in request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	name, reqErr := requestutils.GetURLParamString(r, types.URLParamGitRepoName)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, nil, "repo name not found in request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	filename := r.URL.Query().Get("filename")
	// if branch is empty then the latest workflow run is rerun, meaning that if
	// there were multiple workflow runs for the same file but for different branches
	// only the very latest of the workflow runs will be rerun
	branch := r.URL.Query().Get("branch")
	releaseName := r.URL.Query().Get("release_name")
	telemetry.WithAttributes(
		span,
		telemetry.AttributeKV{Key: "repo-owner", Value: owner},
		telemetry.AttributeKV{Key: "repo-name", Value: name},
		telemetry.AttributeKV{Key: "branch", Value: branch},
		telemetry.AttributeKV{Key: "release-name", Value: releaseName},
	)

	if filename == "" && releaseName == "" {
		err := telemetry.Error(ctx, span, nil, "filename and release name are both empty")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	if filename == "" {
		if c.Config().ServerConf.InstanceName != "" {
			filename = fmt.Sprintf("porter_%s_%s.yml", strings.Replace(
				strings.ToLower(releaseName), "-", "_", -1),
				strings.ToLower(c.Config().ServerConf.InstanceName),
			)
		} else {
			filename = fmt.Sprintf("porter_%s.yml", strings.Replace(
				strings.ToLower(releaseName), "-", "_", -1),
			)
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "filename", Value: filename})

	client, err := GetGithubAppClientFromRequest(c.Config(), r)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting github app client from request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	latestWorkflowRun, err := commonutils.GetLatestWorkflowRun(client, owner, name, filename, branch)
	if err != nil && errors.Is(err, commonutils.ErrNoWorkflowRuns) {
		err = telemetry.Error(ctx, span, err, "no workflow runs found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	} else if err != nil && errors.Is(err, commonutils.ErrWorkflowNotFound) {
		err = telemetry.Error(ctx, span, err, "workflow not found")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound))
		return
	} else if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest workflow run")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if latestWorkflowRun.GetStatus() == "in_progress" || latestWorkflowRun.GetStatus() == "queued" {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-pending-workflow-status", Value: latestWorkflowRun.GetStatus()})
		w.WriteHeader(http.StatusConflict)
		c.WriteResult(w, r, latestWorkflowRun.GetHTMLURL())
		return
	}

	_, err = client.Actions.RerunWorkflowByID(r.Context(), owner, name, latestWorkflowRun.GetID())
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error rerunning workflow")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	latestWorkflowRun, err = commonutils.GetLatestWorkflowRun(client, owner, name, filename, branch)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error getting latest workflow run after rerunning workflow")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	newWorkflowRunUrl := latestWorkflowRun.GetHTMLURL()
	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "new-workflow-run-url", Value: newWorkflowRunUrl})

	c.WriteResult(w, r, newWorkflowRunUrl)
}
