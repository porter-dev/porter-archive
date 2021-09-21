package oauth_callback

import (
	"context"
	"fmt"
	"net/http"

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

	if session.Values["query_params"] != "" {
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", session.Values["query_params"]), 302)
	} else {
		http.Redirect(w, r, "/dashboard", 302)
	}
}
