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
	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)

	if !ok {
		return
	}

	filename := r.URL.Query().Get("filename")
	// if branch is empty then the latest workflow run is rerun, meaning that if
	// there were multiple workflow runs for the same file but for different branches
	// only the very latest of the workflow runs will be rerun
	branch := r.URL.Query().Get("branch")
	releaseName := r.URL.Query().Get("release_name")

	if filename == "" && releaseName == "" {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("filename and release name are both empty")))
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

	client, err := GetGithubAppClientFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	latestWorkflowRun, err := commonutils.GetLatestWorkflowRun(client, owner, name, filename, branch)

	if err != nil && errors.Is(err, commonutils.ErrNoWorkflowRuns) {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, 400))
		return
	} else if err != nil && errors.Is(err, commonutils.ErrWorkflowNotFound) {
		w.WriteHeader(http.StatusNotFound)
		c.WriteResult(w, r, filename)
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

	latestWorkflowRun, err = commonutils.GetLatestWorkflowRun(client, owner, name, filename, branch)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, latestWorkflowRun.GetHTMLURL())
}
