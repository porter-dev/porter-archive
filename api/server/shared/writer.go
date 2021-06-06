package shared

import (
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
)

type ResultWriter interface {
	WriteResult(w http.ResponseWriter, v interface{})
}

// default generalizes response codes for common operations
// (http.StatusOK, http.StatusCreated, etc)
type DefaultResultWriter struct {
	config *Config
}

func NewDefaultResultWriter(config *Config) ResultWriter {
	return &DefaultResultWriter{config}
}

func (j *DefaultResultWriter) WriteResult(w http.ResponseWriter, v interface{}) {
	err := json.NewEncoder(w).Encode(v)

	if err != nil {
		apierrors.HandleAPIError(w, j.config.Logger, apierrors.NewErrInternal(err))
	}
}
