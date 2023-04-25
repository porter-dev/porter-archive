package porter_app

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type PorterAppGetHandler struct {
	handlers.PorterHandlerWriter
}

func NewPorterAppGetHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *PorterAppGetHandler {
	return &PorterAppGetHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *PorterAppGetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	p.WriteResult(w, r, proj.ToProjectType())
}
