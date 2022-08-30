package project

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
)

type RolesListHandler struct {
	handlers.PorterHandlerWriter
}

func NewRolesListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *RolesListHandler {
	return &RolesListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *RolesListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("deprecated"), http.StatusBadRequest))
}
