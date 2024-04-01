package oauth_callback

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/internal/telemetry"

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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-oauth-callback-slack")
	defer span.End()

	r = r.Clone(ctx)

	session, err := p.Config().Store.Get(r, p.Config().ServerConf.CookieName)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "session could not be retrieved")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if _, ok := session.Values["state"]; !ok {
		err = telemetry.Error(ctx, span, nil, "state not found in session")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		err = telemetry.Error(ctx, span, nil, "state does not match")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	token, err := p.Config().SlackConf.Exchange(context.TODO(), r.URL.Query().Get("code"))
	if err != nil {
		err = telemetry.Error(ctx, span, err, "exchange failed")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	slackInt, err := slack.TokenToSlackIntegration(token)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "token to slack integration failed")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	projID, _ := session.Values["project_id"].(uint)

	slackInt.UserID = userID
	slackInt.ProjectID = projID

	if _, err = p.Repo().SlackIntegration().CreateSlackIntegration(slackInt); err != nil {
		err = telemetry.Error(ctx, span, err, "create slack integration failed")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
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
