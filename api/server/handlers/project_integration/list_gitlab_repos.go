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
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/xanzy/go-gitlab"
	"gorm.io/gorm"
)

var errUnauthorizedGitlabUser = errors.New("unauthorized gitlab user")

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
	gi, _ := r.Context().Value(types.GitlabIntegrationScope).(*ints.GitlabIntegration)

	client, err := getGitlabClient(p.Repo(), user.ID, project.ID, gi, p.Config())

	if err != nil {
		if errors.Is(err, errUnauthorizedGitlabUser) {
			p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(errUnauthorizedGitlabUser, http.StatusUnauthorized))
		}

		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	giProjects, resp, err := client.Projects.ListProjects(&gitlab.ListProjectsOptions{
		Simple:     gitlab.Bool(true),
		Membership: gitlab.Bool(true),
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

func getGitlabClient(
	repo repository.Repository,
	userID, projectID uint,
	gi *ints.GitlabIntegration,
	config *config.Config,
) (*gitlab.Client, error) {
	giAppOAuth, err := repo.GitlabAppOAuthIntegration().ReadGitlabAppOAuthIntegration(userID, projectID, gi.ID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errUnauthorizedGitlabUser
		}

		return nil, err
	}

	oauthInt, err := repo.OAuthIntegration().ReadOAuthIntegration(projectID, giAppOAuth.OAuthIntegrationID)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errUnauthorizedGitlabUser
		}

		return nil, err
	}

	accessToken, _, err := oauth.GetAccessToken(oauthInt.SharedOAuthModel, commonutils.GetGitlabOAuthConf(
		config, gi,
	), oauth.MakeUpdateGitlabAppOAuthIntegrationFunction(projectID, giAppOAuth, repo))

	if err != nil {
		return nil, errUnauthorizedGitlabUser
	}

	client, err := gitlab.NewOAuthClient(accessToken, gitlab.WithBaseURL(gi.InstanceURL))

	if err != nil {
		return nil, err
	}

	return client, nil
}
