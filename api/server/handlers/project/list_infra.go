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

type ProjectListInfraHandler struct {
	handlers.PorterHandlerWriter
}

func NewProjectListInfraHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ProjectListInfraHandler {
	return &ProjectListInfraHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ProjectListInfraHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	infras, err := p.Repo().Infra().ListInfrasByProjectID(proj.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}

	infraList := make([]*types.Infra, 0)

	for _, infra := range infras {
		infraList = append(infraList, infra.ToInfraType())
	}

	var res types.ListProjectInfraResponse = infraList

	p.WriteResult(w, r, res)
}
