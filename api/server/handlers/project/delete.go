package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
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

	deleteAllProjectRoles(proj.ID, p.Repo())

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

func deleteAllProjectRoles(projectID uint, repo repository.Repository) {
	policies, err := repo.Policy().ListPoliciesByProjectID(projectID)

	if err == nil {
		for _, policy := range policies {
			repo.Policy().DeletePolicy(policy)
		}
	}

	roles, err := repo.ProjectRole().ListProjectRoles(projectID)

	if err == nil {
		for _, role := range roles {
			repo.ProjectRole().DeleteProjectRole(role)
		}
	}
}
