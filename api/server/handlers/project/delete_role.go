package project

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type RoleDeleteHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewRoleDeleteHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *RoleDeleteHandler {
	return &RoleDeleteHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *RoleDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("deprecated"), http.StatusBadRequest))
}
