package project

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type RoleUpdateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRoleUpdateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RoleUpdateHandler {
	return &RoleUpdateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RoleUpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("deprecated"), http.StatusBadRequest))
}
