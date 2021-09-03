package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
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
	var res types.ListProjectRolesResponse = []string{models.RoleAdmin, models.RoleDeveloper, models.RoleViewer}

	p.WriteResult(w, r, res)
}
