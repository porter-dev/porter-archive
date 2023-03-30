package healthcheck

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/provisioner/server/config"
)

type ReadyzHandler struct {
	Config *config.Config
}

func NewReadyzHandler(
	config *config.Config,
) *ReadyzHandler {
	return &ReadyzHandler{
		Config: config,
	}
}

func (c *ReadyzHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	db, err := c.Config.DB.DB()
	if err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	if err := db.Ping(); err != nil {
		apierrors.HandleAPIError(c.Config.Logger, c.Config.Alerter, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	writeHealthy(w)
}

func writeHealthy(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("."))
}
