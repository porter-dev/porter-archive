package gitinstallation

import (
	"context"
	"net/http"

	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type GitRepoListHandler struct {
	handlers.PorterHandlerWriter
	authz.KubernetesAgentGetter
}

func NewGitRepoListHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GitRepoListHandler {
	return &GitRepoListHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GitRepoListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	res := types.ListGitInstallationIDsResponse{}
	tok, err := GetGithubAppOauthTokenFromRequest(c.Config(), r)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// return empty array, this is not an error
			c.WriteResult(w, r, res)
		} else {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}

		return
	}

	client := github.NewClient(c.Config().GithubAppConf.Client(oauth2.NoContext, tok))

	accountIds := make([]int64, 0)

	ghAuthUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	accountIds = append(accountIds, *ghAuthUser.ID)

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", opts)

		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		for _, org := range orgs {
			accountIds = append(accountIds, *org.ID)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	installationData, err := c.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountIDs(accountIds)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	installationIds := types.ListGitInstallationIDsResponse{}

	for _, v := range installationData {
		installationIds = append(installationIds, v.InstallationID)
	}

	c.WriteResult(w, r, installationIds)
}
