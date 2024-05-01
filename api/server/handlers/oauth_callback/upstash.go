package oauth_callback

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/telemetry"
)

// OAuthCallbackUpstashHandler is the handler responding to the upstash oauth callback
type OAuthCallbackUpstashHandler struct {
	handlers.PorterHandlerReadWriter
}

// UpstashApiKeyEndpoint is the endpoint to fetch the upstash developer api key
// nolint:gosec // Not a security key
const UpstashApiKeyEndpoint = "https://api.upstash.com/apikey"

// NewOAuthCallbackUpstashHandler generates a new OAuthCallbackUpstashHandler
func NewOAuthCallbackUpstashHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OAuthCallbackUpstashHandler {
	return &OAuthCallbackUpstashHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// ServeHTTP gets the upstash oauth token from the callback code, uses it to create a developer api token, then creates a new upstash integration
func (p *OAuthCallbackUpstashHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-oauth-callback-upstash")
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

	projID, _ := session.Values["project_id"].(uint)
	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projID},
	)

	if projID == 0 {
		err = telemetry.Error(ctx, span, nil, "project id not found in session")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	token, err := p.Config().UpstashConf.Exchange(ctx, r.URL.Query().Get("code"))
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

	// make an http call to https://api.upstash.com/apikey with authorization: bearer <access_token>
	// to get the api key
	apiKey, err := fetchUpstashApiKey(ctx, token.AccessToken)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error fetching upstash api key")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	oauthInt := integrations.UpstashIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken:  []byte(token.AccessToken),
			RefreshToken: []byte(token.RefreshToken),
			Expiry:       token.Expiry,
		},
		ProjectID:       projID,
		DeveloperApiKey: []byte(apiKey),
	}

	oauthInt, err = p.Repo().UpstashIntegration().Insert(ctx, oauthInt)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error creating oauth integration")
		p.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	if redirectStr, ok := session.Values["redirect_uri"].(string); ok && redirectStr != "" {
		// attempt to parse the redirect uri, if it fails just redirect to dashboard
		redirectURI, err := url.Parse(redirectStr)
		if err != nil {
			http.Redirect(w, r, "/dashboard", http.StatusFound)
		}

		http.Redirect(w, r, fmt.Sprintf("%s?%s", redirectURI.Path, redirectURI.RawQuery), http.StatusFound)
	} else {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}
}

// UpstashApiKeyRequest is the request body to fetch the upstash developer api key
type UpstashApiKeyRequest struct {
	Name string `json:"name"`
}

// UpstashApiKeyResponse is the response body to fetch the upstash developer api key
type UpstashApiKeyResponse struct {
	ApiKey string `json:"api_key"`
}

func fetchUpstashApiKey(ctx context.Context, accessToken string) (string, error) {
	ctx, span := telemetry.NewSpan(ctx, "fetch-upstash-api-key")
	defer span.End()

	client := &http.Client{}
	data := UpstashApiKeyRequest{
		Name: fmt.Sprintf("PORTER_API_KEY_%d", time.Now().Unix()),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error marshalling request body")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, UpstashApiKeyEndpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error creating request")
	}

	// Set the Authorization header
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error sending request")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "status-code", Value: resp.StatusCode})
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "read-response-body-error", Value: err.Error()})
		}
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "response-body", Value: string(body)})
		return "", telemetry.Error(ctx, span, nil, "unexpected status code")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error reading response body")
	}

	var responseData UpstashApiKeyResponse
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "error unmarshalling response body")
	}

	return responseData.ApiKey, nil
}
