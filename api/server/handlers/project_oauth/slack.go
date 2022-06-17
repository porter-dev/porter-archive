package project_oauth

import (
	"net/http"

	"golang.org/x/oauth2"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/oauth"
)

type ProjectOAuthSlackHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectOAuthSlackHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectOAuthSlackHandler {
	return &ProjectOAuthSlackHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectOAuthSlackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	if err := p.PopulateOAuthSession(w, r, state, true, false, "", 0); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// specify access type offline to get a refresh token
	url := p.Config().SlackConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}
