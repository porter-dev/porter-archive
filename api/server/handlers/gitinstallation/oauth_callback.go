package gitinstallation

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/models/integrations"
	"golang.org/x/oauth2"
)

type GithubAppOAuthCallbackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewGithubAppOAuthCallbackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GithubAppOAuthCallbackHandler {
	return &GithubAppOAuthCallbackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GithubAppOAuthCallbackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	session, err := c.Config().Store.Get(r, c.Config().ServerConf.CookieName)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	token, err := c.Config().GithubAppConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil || !token.Valid() {
		if redirectStr, ok := session.Values["redirect_uri"].(string); ok && redirectStr != "" {
			// attempt to parse the redirect uri, if it fails just redirect to dashboard
			redirectURI, err := url.Parse(redirectStr)

			if err != nil {
				http.Redirect(w, r, "/dashboard", 302)
			}

			http.Redirect(w, r, fmt.Sprintf("%s?%s", redirectURI.Path, redirectURI.RawQuery), 302)
		} else {
			http.Redirect(w, r, "/dashboard", 302)
		}

		return
	}

	oauthInt := &integrations.GithubAppOAuthIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken:  []byte(token.AccessToken),
			RefreshToken: []byte(token.RefreshToken),
			Expiry:       token.Expiry,
		},
		UserID: user.ID,
	}

	oauthInt, err = c.Repo().GithubAppOAuthIntegration().CreateGithubAppOAuthIntegration(oauthInt)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	user.GithubAppIntegrationID = oauthInt.ID

	user, err = c.Repo().User().UpdateUser(user)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.Config().AnalyticsClient.Track(analytics.GithubConnectionSuccessTrack(
		&analytics.GithubConnectionSuccessTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		},
	))

	if redirectStr, ok := session.Values["redirect_uri"].(string); ok && redirectStr != "" {
		// attempt to parse the redirect uri, if it fails just redirect to dashboard
		redirectURI, err := url.Parse(redirectStr)

		if err != nil {
			http.Redirect(w, r, "/dashboard", 302)
		}

		http.Redirect(w, r, fmt.Sprintf("%s?%s", redirectURI.Path, redirectURI.RawQuery), 302)
	} else {
		http.Redirect(w, r, "/dashboard", 302)
	}
}
