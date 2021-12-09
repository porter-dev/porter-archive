package user

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"gorm.io/gorm"

	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/api/server/authn"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
)

type UserOAuthGithubCallbackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserOAuthGithubCallbackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserOAuthGithubCallbackHandler {
	return &UserOAuthGithubCallbackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *UserOAuthGithubCallbackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	session, err := p.Config().Store.Get(r, p.Config().ServerConf.CookieName)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if _, ok := session.Values["state"]; !ok {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	token, err := p.Config().GithubConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(err))
		return
	}

	if !token.Valid() {
		p.HandleAPIError(w, r, apierrors.NewErrForbidden(fmt.Errorf("invalid token")))
		return
	}

	// otherwise, create the user if not exists
	user, err := upsertUserFromToken(p.Config(), token)

	if err != nil && strings.Contains(err.Error(), "already registered") {
		http.Redirect(w, r, "/login?error="+url.QueryEscape(err.Error()), 302)
		return
	} else if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	p.Config().AnalyticsClient.Identify(analytics.CreateSegmentIdentifyUser(user))

	// save the user as authenticated in the session
	redirect, err := authn.SaveUserAuthenticated(w, r, p.Config(), user)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// non-fatal send email verification
	if !user.EmailVerified {
		err = startEmailVerification(p.Config(), w, r, user)

		if err != nil {
			p.HandleAPIErrorNoWrite(w, r, apierrors.NewErrInternal(err))
		}
	}

	if redirect != "" {
		http.Redirect(w, r, redirect, http.StatusFound)
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
}

func upsertUserFromToken(config *config.Config, tok *oauth2.Token) (*models.User, error) {
	// determine if the user already exists
	client := github.NewClient(config.GithubConf.Client(oauth2.NoContext, tok))

	githubUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		return nil, err
	}

	user, err := config.Repo.User().ReadUserByGithubUserID(*githubUser.ID)

	// if the user does not exist, create new user
	if err != nil && err == gorm.ErrRecordNotFound {
		emails, _, err := client.Users.ListEmails(context.Background(), &github.ListOptions{})

		if err != nil {
			return nil, err
		}

		primary := ""
		verified := false

		// get the primary email
		for _, email := range emails {
			if email.GetPrimary() {
				primary = email.GetEmail()
				verified = email.GetVerified()
				break
			}
		}

		if primary == "" {
			return nil, fmt.Errorf("github user must have an email")
		}

		if err := checkUserRestrictions(config.ServerConf, primary); err != nil {
			return nil, err
		}

		// check if a user with that email address already exists
		_, err = config.Repo.User().ReadUserByEmail(primary)

		if err == gorm.ErrRecordNotFound {
			user = &models.User{
				Email:         primary,
				EmailVerified: !config.Metadata.Email || verified,
				GithubUserID:  githubUser.GetID(),
			}

			user, err = config.Repo.User().CreateUser(user)

			if err != nil {
				return nil, err
			}

			config.AnalyticsClient.Track(analytics.UserCreateTrack(&analytics.UserCreateTrackOpts{
				UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
				Email:               user.Email,
			}))
		} else if err == nil {
			return nil, fmt.Errorf("email already registered")
		} else if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, fmt.Errorf("unexpected error occurred:%s", err.Error())
	}

	return user, nil
}
