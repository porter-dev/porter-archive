package authz

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/go-github/github"
	"golang.org/x/oauth2"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/oauth"
)

type GitInstallationScopedFactory struct {
	config *config.Config
}

func NewGitInstallationScopedFactory(
	config *config.Config,
) *GitInstallationScopedFactory {
	return &GitInstallationScopedFactory{config}
}

func (p *GitInstallationScopedFactory) Middleware(next http.Handler) http.Handler {
	return &GitInstallationScopedMiddleware{next, p.config}
}

type GitInstallationScopedMiddleware struct {
	next   http.Handler
	config *config.Config
}

func (p *GitInstallationScopedMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// read the user to perform authorization
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	// get the registry id from the URL param context
	reqScopes, _ := r.Context().Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	gitInstallationID := reqScopes[types.GitInstallationScope].Resource.UInt

	gitInstallation, err := p.config.Repo.GithubAppInstallation().ReadGithubAppInstallationByInstallationID(gitInstallationID)

	if err != nil {
		apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	if err := p.doesUserHaveGitInstallationAccess(user.GithubAppIntegrationID, gitInstallationID); err != nil {
		apierrors.HandleAPIError(p.config, w, r, apierrors.NewErrInternal(err), true)
		return
	}

	ctx := NewGitInstallationContext(r.Context(), gitInstallation)
	r = r.Clone(ctx)
	p.next.ServeHTTP(w, r)
}

func NewGitInstallationContext(ctx context.Context, ga *integrations.GithubAppInstallation) context.Context {
	return context.WithValue(ctx, types.GitInstallationScope, ga)
}

// DoesUserHaveGitInstallationAccess checks that a user has access to an installation id
// by ensuring the installation id exists for one org or account they have access to
// note that this makes a github API request, but the endpoint is fast so this doesn't add
// much overhead
func (p *GitInstallationScopedMiddleware) doesUserHaveGitInstallationAccess(githubIntegrationID, gitInstallationID uint) error {
	oauthInt, err := p.config.Repo.GithubAppOAuthIntegration().ReadGithubAppOauthIntegration(githubIntegrationID)

	if err != nil {
		return err
	}

	if _, _, err = oauth.GetAccessToken(oauthInt.SharedOAuthModel,
		&p.config.GithubAppConf.Config,
		oauth.MakeUpdateGithubAppOauthIntegrationFunction(oauthInt, p.config.Repo)); err != nil {
		return err
	}

	client := github.NewClient(p.config.GithubConf.Client(oauth2.NoContext, &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		TokenType:    "Bearer",
	}))

	accountIDs := make([]int64, 0)

	AuthUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		return err
	}

	accountIDs = append(accountIDs, *AuthUser.ID)

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", opts)

		if err != nil {
			return err
		}

		for _, org := range orgs {
			accountIDs = append(accountIDs, *org.ID)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	installations, err := p.config.Repo.GithubAppInstallation().ReadGithubAppInstallationByAccountIDs(accountIDs)

	for _, installation := range installations {
		if uint(installation.InstallationID) == gitInstallationID {
			return nil
		}
	}

	return apierrors.NewErrForbidden(
		fmt.Errorf("user does not have access to github app installation %d", gitInstallationID),
	)
}
