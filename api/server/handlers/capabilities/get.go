package capabilities

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
)

type CapabilitiesGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewCapabilitiesGetHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *CapabilitiesGetHandler {
	return &CapabilitiesGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (v *CapabilitiesGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.WriteResult(w, v.Config().Capabilities)
}
