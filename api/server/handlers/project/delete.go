package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectDeleteHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectDeleteHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectDeleteHandler {
	return &ProjectDeleteHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	proj, err := p.Repo().Project().DeleteProject(proj)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(w, r, proj.ToProjectType())

	// delete the billing team
	if err := p.Config().BillingManager.DeleteTeam(user, proj); err != nil {
		// we do not write error response, since setting up billing error can be
		// resolved later and may not be fatal
		p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
	}
}
