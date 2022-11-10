package shared

import (
	"encoding/json"
	"errors"
	"net/http"
	"syscall"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/alerter"
	"github.com/porter-dev/porter/pkg/logger"
)

type ResultWriter interface {
	WriteResult(w http.ResponseWriter, r *http.Request, v interface{})
}

// default generalizes response codes for common operations
// (http.StatusOK, http.StatusCreated, etc)
type DefaultResultWriter struct {
	logger  *logger.Logger
	alerter alerter.Alerter
}

func NewDefaultResultWriter(
	logger *logger.Logger,
	alerter alerter.Alerter,
) ResultWriter {
	return &DefaultResultWriter{logger, alerter}
}

func (j *DefaultResultWriter) WriteResult(w http.ResponseWriter, r *http.Request, v interface{}) {
	err := json.NewEncoder(w).Encode(v)

	if errors.Is(err, syscall.EPIPE) || errors.Is(err, syscall.ECONNRESET) {
		// either a broken pipe error or econnreset, ignore. This means the client closed the connection while
		// the server was sending bytes.
		return
	} else if err != nil {
		apierrors.HandleAPIError(j.logger, j.alerter, w, r, apierrors.NewErrInternal(err), true)
	}
}
