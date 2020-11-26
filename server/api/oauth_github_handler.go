package api

// import (
// 	"context"
// 	"fmt"
// 	"net/http"
// 	"strconv"

// 	"github.com/porter-dev/porter/internal/models"

// 	"github.com/go-chi/chi"
// 	"github.com/google/go-github/github"
// 	"github.com/porter-dev/porter/internal/oauth"
// 	"golang.org/x/oauth2"
// )

// // HandleGithubOAuthStartUser starts the oauth2 flow for a user login request.
// func (app *App) HandleGithubOAuthStartUser(w http.ResponseWriter, r *http.Request) {
// 	state := oauth.CreateRandomState()

// 	err := app.populateOAuthSession(w, r, state, false)

// 	if err != nil {
// 		app.handleErrorDataRead(err, w)
// 		return
// 	}

// 	// specify access type offline to get a refresh token
// 	url := app.GithubConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)

// 	http.Redirect(w, r, url, 302)
// }

// // HandleGithubOAuthStartProject starts the oauth2 flow for a project repo request.
// // In this handler, the project id gets written to the session (along with the oauth
// // state param), so that the correct project id can be identified in the callback.
// func (app *App) HandleGithubOAuthStartProject(w http.ResponseWriter, r *http.Request) {
// 	state := oauth.CreateRandomState()

// 	err := app.populateOAuthSession(w, r, state, true)

// 	if err != nil {
// 		app.handleErrorDataRead(err, w)
// 		return
// 	}

// 	// specify access type offline to get a refresh token
// 	url := app.GithubConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)

// 	http.Redirect(w, r, url, 302)
// }

// // HandleGithubOAuthCallback verifies the callback request by checking that the
// // state parameter has not been modified, and validates the token.
// // There is a difference between the oauth flow when logging a user in, and when
// // linking a repository.
// //
// // When logging a user in, the access token gets stored in the session, and no refresh
// // token is requested. We store the access token in the session because a user can be
// // logged in multiple times with a single access token.
// //
// // NOTE: this user flow will likely be augmented with Dex, or entirely replaced with Dex.
// //
// // However, when linking a repository, the access token and refresh token are requested when
// // the flow has started. A project also gets linked to the session. After callback, a new
// // github config gets stored for the project, and the user will then get redirected to
// // a URL that allows them to select their repositories they'd like to link. We require a refresh
// // token because we need permanent access to the linked repository.
// func (app *App) HandleGithubOAuthCallback(w http.ResponseWriter, r *http.Request) {
// 	session, err := app.store.Get(r, app.cookieName)

// 	if err != nil {
// 		app.handleErrorDataRead(err, w)
// 		return
// 	}

// 	if _, ok := session.Values["state"]; !ok {
// 		app.sendExternalError(
// 			err,
// 			http.StatusForbidden,
// 			HTTPError{
// 				Code: http.StatusForbidden,
// 				Errors: []string{
// 					"Could not read cookie: are cookies enabled?",
// 				},
// 			},
// 			w,
// 		)

// 		return
// 	}

// 	if r.URL.Query().Get("state") != session.Values["state"] {
// 		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
// 		return
// 	}

// 	token, err := app.GithubConfig.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

// 	if err != nil {
// 		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
// 		return
// 	}

// 	if !token.Valid() {
// 		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
// 		return
// 	}

// 	userID, _ := session.Values["user_id"].(uint)
// 	projID, _ := session.Values["project_id"].(uint)

// 	app.updateProjectFromToken(projID, userID, token)

// 	if session.Values["query_params"] != "" {
// 		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", session.Values["query_params"]), 302)
// 	} else {
// 		http.Redirect(w, r, "/dashboard", 302)
// 	}
// }

// func (app *App) populateOAuthSession(w http.ResponseWriter, r *http.Request, state string, isProject bool) error {
// 	session, err := app.store.Get(r, app.cookieName)

// 	if err != nil {
// 		return err
// 	}

// 	// need state parameter to validate when redirected
// 	session.Values["state"] = state

// 	if isProject {
// 		// read the project id and add it to the session
// 		projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 		if err != nil || projID == 0 {
// 			return fmt.Errorf("could not read project id")
// 		}

// 		session.Values["project_id"] = projID
// 		session.Values["query_params"] = r.URL.RawQuery
// 	}

// 	if err := session.Save(r, w); err != nil {
// 		app.logger.Warn().Err(err)
// 	}

// 	return nil
// }

// func (app *App) upsertUserFromToken() error {
// 	return fmt.Errorf("UNIMPLEMENTED")
// }

// // updates a project's repository clients with the token information.
// func (app *App) updateProjectFromToken(projectID uint, userID uint, tok *oauth2.Token) error {
// 	// get the list of repositories that this token has access to
// 	client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, tok))

// 	user, _, err := client.Users.Get(context.Background(), "")

// 	if err != nil {
// 		return err
// 	}

// 	repoClient := &models.RepoClient{
// 		ProjectID:    projectID,
// 		UserID:       userID,
// 		RepoUserID:   uint(user.GetID()),
// 		Kind:         models.RepoClientGithub,
// 		AccessToken:  []byte(tok.AccessToken),
// 		RefreshToken: []byte(tok.RefreshToken),
// 	}

// 	repoClient, err = app.repo.RepoClient.CreateRepoClient(repoClient)

// 	if err != nil {
// 		return err
// 	}

// 	return nil
// }
