package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectGetHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *ProjectGetHandler {
	return &ProjectGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	p.WriteResult(w, proj.ToProjectType())
}
