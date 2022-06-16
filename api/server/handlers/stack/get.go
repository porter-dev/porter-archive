package stack

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type StackGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewStackGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *StackGetHandler {
	return &StackGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *StackGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stack, _ := r.Context().Value(types.StackScope).(*models.Stack)

	p.WriteResult(w, r, stack.ToStackType())
}
