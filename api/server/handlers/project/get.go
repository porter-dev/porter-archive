package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectGetHandler struct {
	config *shared.Config
	writer shared.ResultWriter
}

func NewProjectGetHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *ProjectGetHandler {
	return &ProjectGetHandler{config, writer}
}

func (p *ProjectGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	p.writer.WriteResult(w, proj.ToProjectType())
}
