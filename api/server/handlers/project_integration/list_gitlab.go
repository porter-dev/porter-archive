package project_integration

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type ListGitlabHandler struct {
	handlers.PorterHandlerWriter
}

func NewListGitlabHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListGitlabHandler {
	return &ListGitlabHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (p *ListGitlabHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	gitlabInts, err := p.Repo().GitlabIntegration().ListGitlabIntegrationsByProjectID(project.ID)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListGitlabResponse = make([]*types.GitlabIntegration, 0)

	for _, gitlabInt := range gitlabInts {
		res = append(res, gitlabInt.ToGitlabIntegrationType())
	}

	p.WriteResult(w, r, res)
}
