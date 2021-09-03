package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
)

type ProjectListRolesHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectListRolesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectListRolesHandler {
	return &ProjectListRolesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectListRolesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var res types.ListProjectRolesResponse = []types.RoleKind{types.RoleAdmin, types.RoleDeveloper, types.RoleViewer}

	p.WriteResult(w, r, res)
}
