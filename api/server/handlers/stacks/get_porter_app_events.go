package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type GetPorterAppEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetPorterAppEventHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetPorterAppHandler {
	return &GetPorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetPorterAppEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c.WriteResult(w, r, types.PorterAppEvent{})
}
