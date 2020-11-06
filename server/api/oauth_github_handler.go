package api

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
)

// There is a difference between the oauth flow when logging a user in, and when
// linking a repository.

// When logging a user in, the access token gets stored in the session, and no refresh
// token is requested. We store the access token in the session because a user can be
// logged in multiple times with a single access token.

// NOTE: this user flow will likely be augmented with Dex, or entirely replaced with Dex.

// However, when linking a repository, the access token and refresh token are requested when
// the flow has started. A project also gets linked to the session. After callback, a new
// github config gets stored for the project, and the user will then get redirected to
// a URL that allows them to select their repositories they'd like to link. We require a refresh
// token because we need permanent access to the linked repository.

func (app *App) HandleOAuthStartUser(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, false)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.GithubConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)

	http.Redirect(w, r, url, 302)
}

func (app *App) HandleOAuthStartProject(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, true)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.GithubConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}

func (app *App) HandleOauthCallback(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	if _, ok := session.Values["state"]; !ok {
		// TODO -- SEND A CUSTOM ERROR, PROBABLY MEANS COOKIES ARE NOT ENABLED
		// FOR NOW JUST SEND DATA READ ERROR
		app.handleErrorDataRead(err, w)
		return
	}

	if r.URL.Query().Get("state") != session.Values["state"] {
		// TODO -- SEND A CUSTOM ERROR, THIS MEANS THAT IDP CANNOT BE TRUSTED
		app.handleErrorDataRead(err, w)
		return
	}

	token, err := app.GithubConfig.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		// TODO -- SEND A CUSTOM ERROR
		app.handleErrorDataRead(err, w)
		return
	}

	if !token.Valid() {
		// TODO -- SEND A CUSTOM ERROR
		app.handleErrorDataRead(err, w)
		return
	}

	app.updateProjectFromToken(token)

	// client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, token))

	// client.

	// TODO -- determine if the user already exists as a github user with that email
	// If the user does not exist, create the user in the database

	// If the user does exist, save the username, kind, and access_token in the session

	// user, _, err := client.Users.Get(context.Background(), "")
	// if err != nil {
	// 	fmt.Println(w, "error getting name")
	// 	return
	// }

	// session.Values["githubUserName"] = user.Name
	// session.Values["githubAccessToken"] = token
	// session.Save(r, w)

	http.Redirect(w, r, "/", 302)
}

func (app *App) populateOAuthSession(w http.ResponseWriter, r *http.Request, state string, isProject bool) error {

	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		return err
	}

	// need state parameter to validate when redirected
	session.Values["state"] = state

	if isProject {
		// read the project id and add it to the session
		projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

		if err != nil || projID == 0 {
			return fmt.Errorf("could not read project id")
		}

		session.Values["project_id"] = projID
	}

	if err := session.Save(r, w); err != nil {
		app.logger.Warn().Err(err)
	}

	return nil
}

func (app *App) upsertUserFromToken() error {
	return fmt.Errorf("UNIMPLEMENTED")
}

// updates a project's repository clients with the token information.
func (app *App) updateProjectFromToken(tok *oauth2.Token) error {
	// get the list of repositories that this token has access to
	client := github.NewClient(app.GithubConfig.Client(oauth2.NoContext, tok))

	repos, _, err := client.Repositories.List(context.Background(), "", nil)

	if err != nil {
		return err
	}

	for _, repo := range repos {
		fmt.Println(repo.GetName())
	}

	return fmt.Errorf("UNIMPLEMENTED")
}
