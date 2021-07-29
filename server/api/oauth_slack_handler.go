package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/integrations/slack"
	"github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
)

// HandleSlackOAuthStartProject starts the oauth2 flow for a project slack request.
// In this handler, the project id gets written to the session (along with the oauth
// state param), so that the correct project id can be identified in the callback.
func (app *App) HandleSlackOAuthStartProject(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, true)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.SlackConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}

// HandleSlackOAuthCallback verifies the callback request by checking that the
// state parameter has not been modified, and validates the token.
func (app *App) HandleSlackOAuthCallback(w http.ResponseWriter, r *http.Request) {
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

	token, err := app.SlackConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		fmt.Println("ERR IS", err)
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	projID, _ := session.Values["project_id"].(uint)

	slackInt, err := slack.TokenToSlackIntegration(token)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	slackInt.UserID = userID
	slackInt.ProjectID = projID

	// save to repository
	slackInt, err = app.Repo.SlackIntegration.CreateSlackIntegration(slackInt)

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

// HandleListSlackIntegrations lists all slack integrations belonging to a certain project
// ID
func (app *App) HandleListSlackIntegrations(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	slackInts, err := app.Repo.SlackIntegration.ListSlackIntegrationsByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extSlackInts := make([]*integrations.SlackIntegrationExternal, 0)

	for _, slackInt := range slackInts {
		extSlackInts = append(extSlackInts, slackInt.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extSlackInts); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
