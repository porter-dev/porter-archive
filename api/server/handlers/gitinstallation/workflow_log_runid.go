package gitinstallation

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type GetSpecificWorkflowLogsHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetSpecificWorkflowLogsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetSpecificWorkflowLogsHandler {
	return &GetSpecificWorkflowLogsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetSpecificWorkflowLogsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	owner, name, ok := commonutils.GetOwnerAndNameParams(c, w, r)
	if !ok {
		return
	}

	releaseName := r.URL.Query().Get("release_name")
	filename := r.URL.Query().Get("filename")
	runNumberStr := r.URL.Query().Get("run_id")
	fmt.Println(runNumberStr)

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

	// parse runNumber from string to int64
	runNumber, err := strconv.ParseInt(runNumberStr, 10, 64)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	specificWorkflowRun, _, err := client.Actions.GetWorkflowRunByID(r.Context(), owner, name, runNumber)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	logsURL, _, err := client.Actions.GetWorkflowRunLogs(r.Context(), owner, name, specificWorkflowRun.GetID(), false)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	fmt.Printf("Fetched specific workflow logs URL: %v\n", logsURL.String())

	c.WriteResult(w, r, logsURL.String())
}
