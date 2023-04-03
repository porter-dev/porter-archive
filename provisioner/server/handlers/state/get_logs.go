package state

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/provisioner/integrations/storage"
	"github.com/porter-dev/porter/provisioner/server/config"
	ptypes "github.com/porter-dev/porter/provisioner/types"
)

type LogsGetHandler struct {
	Config       *config.Config
	resultWriter shared.ResultWriter
}

func NewLogsGetHandler(
	config *config.Config,
) *LogsGetHandler {
	return &LogsGetHandler{
		Config:       config,
		resultWriter: shared.NewDefaultResultWriter(config.Logger, config.Alerter),
	}
}

func (c *LogsGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the infra from the attached scope
	infra, _ := r.Context().Value(types.InfraScope).(*models.Infra)
	operation, _ := r.Context().Value(types.OperationScope).(*models.Operation)

	fileBytes, err := c.Config.StorageManager.ReadFile(
		infra,
		fmt.Sprintf("%s-%d-%d-%s-%s-logs.txt", infra.Kind, infra.ProjectID, infra.ID, infra.Suffix, operation.UID),
		false,
	)
	if err != nil {
		// if the file does not exist yet, return a 404 status code
		if errors.Is(err, storage.FileDoesNotExist) {
			apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrPassThroughToClient(
				fmt.Errorf("current logs file does not exist yet"),
				http.StatusNotFound,
			), true)

			return
		}

		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	logLines := make([]string, 0)
	scanner := bufio.NewScanner(bytes.NewReader(fileBytes))

	for scanner.Scan() {
		logLines = append(logLines, scanner.Text())
	}

	resp := &ptypes.GetLogsResponse{
		Logs: logLines,
	}

	c.resultWriter.WriteResult(w, r, resp)
}
