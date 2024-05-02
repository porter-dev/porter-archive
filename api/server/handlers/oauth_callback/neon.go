package oauth_callback

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/telemetry"
)

// OAuthCallbackNeonHandler is the handler responding to the neon oauth callback
type OAuthCallbackNeonHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewOAuthCallbackNeonHandler generates a new OAuthCallbackNeonHandler
func NewOAuthCallbackNeonHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OAuthCallbackNeonHandler {
	return &OAuthCallbackNeonHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP gets the neon oauth token from the callback code, uses it to create a developer api token, then creates a new neon integration
func (p *OAuthCallbackNeonHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-oauth-callback-neon")
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

	projID, ok := session.Values["project_id"].(uint)
	if !ok {
		err = telemetry.Error(ctx, span, nil, "project id not found in session")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projID},
	)

	if projID == 0 {
		err = telemetry.Error(ctx, span, nil, "project id not found in session")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		err = telemetry.Error(ctx, span, nil, "code not found in query params")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	token, err := p.Config().NeonConf.Exchange(ctx, code)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "exchange failed")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	if !token.Valid() {
		err = telemetry.Error(ctx, span, nil, "invalid token")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	oauthInt := integrations.NeonIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken:  []byte(token.AccessToken),
			RefreshToken: []byte(token.RefreshToken),
			Expiry:       token.Expiry,
		},
		ProjectID: projID,
	}

	_, err = p.Repo().NeonIntegration().Insert(ctx, oauthInt)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating oauth integration")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	redirect := "/dashboard"
	if redirectStr, ok := session.Values["redirect_uri"].(string); ok && redirectStr != "" {
		redirectURI, err := url.Parse(redirectStr)
		if err == nil {
			redirect = fmt.Sprintf("%s?%s", redirectURI.Path, redirectURI.RawQuery)
		}
	}
	http.Redirect(w, r, redirect, http.StatusFound)
}
