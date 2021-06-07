package project

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ProjectListHandler struct {
	config *shared.Config
	writer shared.ResultWriter
}

func NewProjectListHandler(
	config *shared.Config,
	writer shared.ResultWriter,
) *ProjectListHandler {
	return &ProjectListHandler{config, writer}
}

func (p *ProjectListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	// read all projects for this user
	projects, err := p.config.Repo.Project().ListProjectsByUserID(user.ID)

	if err != nil {
		apierrors.HandleAPIError(w, p.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Project, len(projects))

	for i, proj := range projects {
		res[i] = proj.ToProjectType()
	}

	p.writer.WriteResult(w, res)
}
