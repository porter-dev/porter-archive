package project_role

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type GetProjectRoleScopeHierarchyHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGetProjectRoleScopeHierarchyHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetProjectRoleScopeHierarchyHandler {
	return &GetProjectRoleScopeHierarchyHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetProjectRoleScopeHierarchyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c.WriteResult(w, r, types.ScopeHeirarchy)
}
