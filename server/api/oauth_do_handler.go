package api

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"

	"github.com/porter-dev/porter/internal/models/integrations"
)

// HandleDOOAuthStartProject starts the oauth2 flow for a project digitalocean request.
// In this handler, the project id gets written to the session (along with the oauth
// state param), so that the correct project id can be identified in the callback.
func (app *App) HandleDOOAuthStartProject(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, true)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.DOConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}

// HandleDOOAuthCallback verifies the callback request by checking that the
// state parameter has not been modified, and validates the token.
func (app *App) HandleDOOAuthCallback(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	if _, ok := session.Values["state"]; !ok {
		app.sendExternalError(
			err,
			http.StatusForbidden,
			HTTPError{
				Code: http.StatusForbidden,
				Errors: []string{
					"Could not read cookie: are cookies enabled?",
				},
			},
			w,
		)

		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	token, err := app.DOConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	if !token.Valid() {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	projID, _ := session.Values["project_id"].(uint)

	oauthInt := &integrations.OAuthIntegration{
		SharedOAuthModel: integrations.SharedOAuthModel{
			AccessToken:  []byte(token.AccessToken),
			RefreshToken: []byte(token.RefreshToken),
			Expiry:       token.Expiry,
		},
		Client:    integrations.OAuthDigitalOcean,
		UserID:    userID,
		ProjectID: projID,
	}

	// create the oauth integration first
	oauthInt, err = app.Repo.OAuthIntegration().CreateOAuthIntegration(oauthInt)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	if session.Values["query_params"] != "" {
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", session.Values["query_params"]), 302)
	} else {
		http.Redirect(w, r, "/dashboard", 302)
	}
}
