package project_integration

import (
	"context"
	"net/http"

	"github.com/google/go-github/v39/github"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/handlers/gitinstallation"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"
)

type ListGitIntegrationHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewListGitIntegrationHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListGitIntegrationHandler {
	return &ListGitIntegrationHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ListGitIntegrationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	project, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	gitlabInts, err := p.Repo().GitlabIntegration().ListGitlabIntegrationsByProjectID(project.ID)

	var res types.ListGitIntegrationResponse

	if err == nil {
		for _, gitlabInt := range gitlabInts {
			res = append(res, &types.GitIntegration{
				Provider:      "gitlab",
				InstanceURL:   gitlabInt.InstanceURL,
				IntegrationID: gitlabInt.ID,
			})
		}
	}

	tok, err := gitinstallation.GetGithubAppOauthTokenFromRequest(p.Config(), r)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// return empty array, this is not an error
			p.WriteResult(w, r, res)
		} else {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	client := github.NewClient(p.Config().GithubAppConf.Client(context.Background(), tok))

	var accountIDs []int64
	accountIDMap := make(map[int64]string)

	ghAuthUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		p.WriteResult(w, r, res)
		return
	}

	accountIDs = append(accountIDs, ghAuthUser.GetID())
	accountIDMap[ghAuthUser.GetID()] = ghAuthUser.GetLogin()

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", opts)

		if err != nil {
			p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			p.WriteResult(w, r, res)
			return
		}

		for _, org := range orgs {
			accountIDs = append(accountIDs, org.GetID())
			accountIDMap[org.GetID()] = org.GetLogin()
		}

		if pages.NextPage == 0 {
			break
		}
	}

	installationData, err := p.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountIDs(accountIDs)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		p.WriteResult(w, r, res)
	}

	for _, data := range installationData {
		res = append(res, &types.GitIntegration{
			Provider:       "github",
			Name:           accountIDMap[data.AccountID],
			InstallationID: data.InstallationID,
		})
	}

	p.WriteResult(w, r, res)
}
