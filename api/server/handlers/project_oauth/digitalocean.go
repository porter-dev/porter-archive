package project_oauth

import (
	"net/http"

	"github.com/porter-dev/porter/internal/telemetry"

	"golang.org/x/oauth2"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/oauth"
)

type ProjectOAuthDOHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewProjectOAuthDOHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectOAuthDOHandler {
	return &ProjectOAuthDOHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *ProjectOAuthDOHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-project-oauth-digital-ocean")
	defer span.End()

	r = r.Clone(ctx)

	state := oauth.CreateRandomState()

	if err := p.PopulateOAuthSession(ctx, w, r, state, true, false, "", 0); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// specify access type offline to get a refresh token
	url := p.Config().DOConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}
