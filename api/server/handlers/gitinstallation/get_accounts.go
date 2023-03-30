package gitinstallation

import (
	"context"
	"net/http"
	"sort"
	"time"

	"github.com/google/go-github/v41/github"
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

func (c *GetGithubAppAccountsHandler) getOrgList(ctx context.Context,
	client *github.Client,
	orgsChan chan<- *github.Organization,
	errChan chan<- error,
) {
	defer close(orgsChan)
	defer close(errChan)

	page := 1

	for {
		select {
		case <-ctx.Done():
			return
		default:
			orgs, pages, err := client.Organizations.List(context.Background(), "", &github.ListOptions{
				PerPage: 100,
				Page:    page,
			})
			if err != nil {
				errChan <- err
				return
			}

			for _, org := range orgs {
				orgsChan <- org
			}

			if pages.NextPage == 0 {
				return
			} else {
				page = pages.NextPage
			}
		}
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

	resultChannel := make(chan *github.Organization, 10)
	errChan := make(chan error)

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	go c.getOrgList(ctx, client, resultChannel, errChan)

resultOrErrorReader:
	for {
		select {
		case result, ok := <-resultChannel:
			if ok {
				res.Accounts = append(res.Accounts, *result.Login)
			} else {
				// channel has been closed now
				break resultOrErrorReader
			}
		case err, ok := <-errChan:
			if ok {
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			} else {
				// nothing in error, must be a close event
				break resultOrErrorReader
			}
		}
	}

	authUser, _, err := client.Users.Get(r.Context(), "")
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
