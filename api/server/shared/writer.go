package shared

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type ResultWriter interface {
	WriteResult(ctx context.Context, w http.ResponseWriter, v interface{})
}

// default generalizes response codes for common operations
// (http.StatusOK, http.StatusCreated, etc)
type DefaultResultWriter struct {
	config *config.Config
}

func NewDefaultResultWriter(conf *config.Config) ResultWriter {
	return &DefaultResultWriter{conf}
}

func (j *DefaultResultWriter) WriteResult(ctx context.Context, w http.ResponseWriter, v interface{}) {
	err := json.NewEncoder(w).Encode(v)

	if err != nil {
		apierrors.HandleAPIError(ctx, j.config, w, apierrors.NewErrInternal(err))
	}
}
