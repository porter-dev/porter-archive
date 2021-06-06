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

	proj, err := p.config.Repo.Project().CreateProject(proj)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	// create a new Role with the user as the admin
	_, err = p.config.Repo.Project().CreateProjectRole(proj, &models.Role{
		Role: types.Role{
			UserID:    user.ID,
			ProjectID: proj.ID,
			Kind:      types.RoleAdmin,
		},
	})

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	// read the project again to get the model with the role attached
	proj, err = p.config.Repo.Project().ReadProject(proj.ID)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	p.writer.WriteResult(w, proj.ToProjectType())
}
