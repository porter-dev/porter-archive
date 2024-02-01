package user

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

type UserOAuthGoogleHandler struct {
	handlers.PorterHandlerReadWriter
}

func NewUserOAuthGoogleHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserOAuthGoogleHandler {
	return &UserOAuthGoogleHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (p *UserOAuthGoogleHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-project-oauth-google")
	defer span.End()

	r = r.Clone(ctx)

	state := oauth.CreateRandomState()

	if err := p.PopulateOAuthSession(ctx, w, r, state, false, false, "", 0); err != nil {
		p.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// specify access type offline to get a refresh token
	url := p.Config().GoogleConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}
