package authz

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/go-github/v41/github"
	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/oauth"
	"github.com/porter-dev/porter/internal/telemetry"
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
	ctx, span := telemetry.NewSpan(r.Context(), "middleware-git-installation")
	defer span.End()

	// read the user to perform authorization
	user, _ := ctx.Value(types.UserScope).(*models.User)

	// get the registry id from the URL param context
	reqScopes, _ := ctx.Value(types.RequestScopeCtxKey).(map[types.PermissionScope]*types.RequestAction)
	gitInstallationID := reqScopes[types.GitInstallationScope].Resource.UInt

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "git-installation-id", Value: gitInstallationID})

	gitInstallation, err := p.config.Repo.GithubAppInstallation().ReadGithubAppInstallationByInstallationID(gitInstallationID)
	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		err = telemetry.Error(ctx, span, err, "git installation not found")
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound), true)
		return
	} else if err != nil {
		err = telemetry.Error(ctx, span, err, "git installation not found")
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(err, http.StatusNotFound), true)
		return
	}

	if err := p.doesUserHaveGitInstallationAccess(ctx, user.GithubAppIntegrationID, gitInstallationID); err != nil {
		err = telemetry.Error(ctx, span, err, "user does not have access to git installation")
		apierrors.HandleAPIError(p.config.Logger, p.config.Alerter, w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden), true)
		return
	}

	ctx = NewGitInstallationContext(ctx, gitInstallation)
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
func (p *GitInstallationScopedMiddleware) doesUserHaveGitInstallationAccess(ctx context.Context, githubIntegrationID, gitInstallationID uint) error {
	ctx, span := telemetry.NewSpan(ctx, "check-user-has-git-installation-access")
	defer span.End()

	oauthInt, err := p.config.Repo.GithubAppOAuthIntegration().ReadGithubAppOauthIntegration(githubIntegrationID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to read github app oauth integration")
	}

	if p.config.GithubAppConf == nil {
		return telemetry.Error(ctx, span, nil, "config has invalid GithubAppConf")
	}

	if _, _, err = oauth.GetAccessToken(oauthInt.SharedOAuthModel,
		&p.config.GithubAppConf.Config,
		oauth.MakeUpdateGithubAppOauthIntegrationFunction(oauthInt, p.config.Repo)); err != nil {
		return telemetry.Error(ctx, span, err, "unable to get access token")
	}

	client := github.NewClient(p.config.GithubConf.Client(ctx, &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		TokenType:    "Bearer",
	}))

	accountIDs := make([]int64, 0)

	AuthUser, _, err := client.Users.Get(ctx, "")
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to get authenticated user")
	}

	accountIDs = append(accountIDs, *AuthUser.ID)

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	for {
		orgs, pages, err := client.Organizations.List(ctx, "", opts)
		if err != nil {
			return telemetry.Error(ctx, span, err, "unable to list organizations")
		}

		for _, org := range orgs {
			accountIDs = append(accountIDs, *org.ID)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "account-ids", Value: accountIDs})

	installations, err := p.config.Repo.GithubAppInstallation().ReadGithubAppInstallationByAccountIDs(accountIDs)
	if err != nil {
		return telemetry.Error(ctx, span, err, "unable to read github app installations")
	}

	installationIds := make([]int64, 0)
	for _, installation := range installations {
		installationIds = append(installationIds, installation.InstallationID)
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "installation-ids-for-account-ids", Value: installationIds})

	for _, installation := range installations {
		if uint(installation.InstallationID) == gitInstallationID {
			return nil
		}
	}

	return apierrors.NewErrForbidden(
		fmt.Errorf("user does not have access to github app installation %d", gitInstallationID),
	)
}
