package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type PorterAppListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppListHandler {
	return &PorterAppListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	p.WriteResult(w, r, nil)
}
