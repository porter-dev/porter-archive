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

type ProjectListHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectListHandler {
	return &ProjectListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the user from context
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	// read all projects for this user
	projects, err := p.Repo().Project().ListProjectsByUserID(user.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res := make([]*types.Project, len(projects))

	for i, proj := range projects {
		res[i] = proj.ToProjectType()
	}

	p.WriteResult(w, r, res)
}
