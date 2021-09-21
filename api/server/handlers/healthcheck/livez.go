package healthcheck

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type LivezHandler struct {
	handlers.PorterHandlerWriter
}

func NewLivezHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *LivezHandler {
	return &LivezHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *LivezHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	writeHealthy(w)
}
