package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type PorterAppEventListHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppEventListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppListHandler {
	return &PorterAppListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppEventListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	res := struct {
		Events []types.PorterAppEvent `json:"events"`
	}{}
	p.WriteResult(w, r, res)
}
