package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectCreateHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
	writer           shared.ResultWriter
}

func NewProjectCreateHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectCreateHandler {
	return &ProjectCreateHandler{config, decoderValidator, writer}
}

func (p *ProjectCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.CreateProjectRequest{}

	ok := p.decoderValidator.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	proj := &models.Project{
		Name: request.Name,
	}

	var err error
	proj, err = CreateProjectWithUser(p.config, proj, user)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	p.writer.WriteResult(w, proj.ToProjectType())
}

func CreateProjectWithUser(
	config *shared.Config,
	proj *models.Project,
	user *models.User,
) (*models.Project, error) {
	proj, err := config.Repo.Project().CreateProject(proj)

	if err != nil {
		return nil, err
	}

	// create a new Role with the user as the admin
	_, err = config.Repo.Project().CreateProjectRole(proj, &models.Role{
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
	proj, err = config.Repo.Project().ReadProject(proj.ID)

	if err != nil {
		return nil, err
	}

	return proj, nil
}
