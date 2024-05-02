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

// ProjectOAuthUpstashHandler is the handler which redirects to the upstash oauth flow
type ProjectOAuthUpstashHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewProjectOAuthUpstashHandler generates a new ProjectOAuthUpstashHandler
func NewProjectOAuthUpstashHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ProjectOAuthUpstashHandler {
	return &ProjectOAuthUpstashHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP populates the oauth session with state and project id then redirects the user to the upstash oauth flow
func (p *ProjectOAuthUpstashHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-project-oauth-upstash")
	defer span.End()

	r = r.Clone(ctx)

	state := oauth.CreateRandomState()

	if err := p.PopulateOAuthSession(ctx, w, r, state, true, false, "", 0); err != nil {
		err = telemetry.Error(ctx, span, err, "population oauth session failed")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	url := p.Config().UpstashConf.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("audience", "upstash-api"))

	http.Redirect(w, r, url, http.StatusFound)
}
