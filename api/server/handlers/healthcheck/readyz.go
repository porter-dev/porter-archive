package healthcheck

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type ReadyzHandler struct {
	handlers.PorterHandlerWriter
}

func NewReadyzHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ReadyzHandler {
	return &ReadyzHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *ReadyzHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	db, err := v.Config().DB.DB()

	if err != nil {
		v.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if err := db.Ping(); err != nil {
		v.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	writeHealthy(w)
}

func writeHealthy(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("."))
}
