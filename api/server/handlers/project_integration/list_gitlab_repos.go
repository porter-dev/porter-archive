package project_integration

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/commonutils"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/xanzy/go-gitlab"
	"gorm.io/gorm"
)

type ListGitlabReposHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewListGitlabReposHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListGitlabReposHandler {
	return &ListGitlabReposHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ListGitlabReposHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	integrationID, reqErr := requestutils.GetURLParamUint(r, "integration_id")

	if reqErr != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(reqErr))
		return
	}

	gi, err := p.Repo().GitlabIntegration().ReadGitlabIntegration(project.ID, integrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("no gitlab integration with ID: %d", integrationID), http.StatusNotFound))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	giAppOAuth, err := p.Repo().GitlabAppOAuthIntegration().ReadGitlabAppOAuthIntegration(user.ID, project.ID, integrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
			return
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	accessToken, _, err := oauth.GetAccessToken(giAppOAuth.SharedOAuthModel, commonutils.GetGitlabOAuthConf(
		p.Config(), gi,
	), oauth.MakeUpdateGitlabAppOAuthIntegrationFunction(giAppOAuth, p.Repo()))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("invalid gitlab access token"),
			http.StatusUnauthorized))
		return
	}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gi.InstanceURL))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	giProjects, resp, err := client.Projects.ListProjects(&gitlab.ListProjectsOptions{
		Simple: gitlab.Bool(true),
	})

	if resp.StatusCode == http.StatusUnauthorized {
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(fmt.Errorf("unauthorized gitlab user"), http.StatusUnauthorized))
		return
	}

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	var res []string

	for _, giProject := range giProjects {
		res = append(res, giProject.PathWithNamespace)
	}

	p.WriteResult(w, r, res)
}
