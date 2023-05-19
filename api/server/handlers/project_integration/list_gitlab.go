package project_integration

import (
	"net/http"

	ints "github.com/porter-dev/porter/internal/models/integrations"

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
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	gitlabInts, err := p.Repo().GitlabIntegration().ListGitlabIntegrationsByProjectID(project.ID)
	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res types.ListGitlabResponse = make([]*types.GitlabIntegrationWithUsername, 0)

	for _, gitlabInt := range gitlabInts {
		username := p.getCurrentUsername(user.ID, project.ID, gitlabInt)
		res = append(res,
			&types.GitlabIntegrationWithUsername{
				*gitlabInt.ToGitlabIntegrationType(),
				username,
			},
		)
	}

	p.WriteResult(w, r, res)
}

func (p *ListGitlabHandler) getCurrentUsername(userID uint, projectID uint, gi *ints.GitlabIntegration) string {
	client, err := getGitlabClient(p.Repo(), userID, projectID, gi, p.Config())
	if err != nil {
		return "Unable to connect"
	}

	currentUser, resp, err := client.Users.CurrentUser()
	if resp.StatusCode == http.StatusUnauthorized {
		return "Unable to connect"
	}

	if err != nil {
		return "Unable to connect"
	}

	return currentUser.Username
}
