package gitinstallation

import (
	"context"
	"net/http"
	"sort"

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

type GetGithubAppAccountsHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewGetGithubAppAccountsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetGithubAppAccountsHandler {
	return &GetGithubAppAccountsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetGithubAppAccountsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	tok, err := GetGithubAppOauthTokenFromRequest(c.Config(), r)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	client := github.NewClient(c.Config().GithubAppConf.Client(oauth2.NoContext, tok))
	res := &types.GetGithubAppAccountsResponse{}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", &github.ListOptions{
			PerPage: 100,
			Page:    1,
		})

		if err != nil {
			continue
		}

		for _, org := range orgs {
			res.Accounts = append(res.Accounts, *org.Login)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	authUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	res.Username = *authUser.Login

	// check if user has app installed in their account
	installation, err := c.Repo().GithubAppInstallation().ReadGithubAppInstallationByAccountID(*authUser.ID)

	if err != nil && err != gorm.ErrRecordNotFound {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if installation != nil {
		res.Accounts = append(res.Accounts, *authUser.Login)
	}

	sort.Strings(res.Accounts)

	c.WriteResult(w, r, res)
}
