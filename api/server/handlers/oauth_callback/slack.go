package oauth_callback

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/integrations/slack"
)

type OAuthCallbackSlackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewOAuthCallbackSlackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OAuthCallbackSlackHandler {
	return &OAuthCallbackSlackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *OAuthCallbackSlackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	token, err := p.Config().SlackConf.Exchange(context.TODO(), r.URL.Query().Get("code"))

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	slackInt, err := slack.TokenToSlackIntegration(token)

	if err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	projID, _ := session.Values["project_id"].(uint)

	slackInt.UserID = userID
	slackInt.ProjectID = projID

	if _, err = p.Repo().SlackIntegration().CreateSlackIntegration(slackInt); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

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
