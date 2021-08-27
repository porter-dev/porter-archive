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

type ProjectCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectCreateHandler {
	return &ProjectCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateProjectRequest{}

	ok := p.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	proj := &models.Project{
		Name: request.Name,
	}

	var err error
	proj, err = CreateProjectWithUser(p.Repo().Project(), proj, user)

	if err != nil {
		p.HandleAPIError(r.Context(), w, apierrors.NewErrInternal(err))
		return
	}

	p.WriteResult(r.Context(), w, proj.ToProjectType())
}

func CreateProjectWithUser(
	projectRepo repository.ProjectRepository,
	proj *models.Project,
	user *models.User,
) (*models.Project, error) {
	proj, err := projectRepo.CreateProject(proj)

	if err != nil {
		return nil, err
	}

	// create a new Role with the user as the admin
	_, err = projectRepo.CreateProjectRole(proj, &models.Role{
		Role: types.Role{
			UserID:    user.ID,
			ProjectID: proj.ID,
			Kind:      types.RoleAdmin,
		},
	})

	if err != nil {
		return nil, err
	}

	// read the project again to get the model with the role attached
	proj, err = projectRepo.ReadProject(proj.ID)

	if err != nil {
		return nil, err
	}

	return proj, nil
}
