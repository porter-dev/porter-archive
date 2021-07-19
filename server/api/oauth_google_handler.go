package api

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"gorm.io/gorm"

	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"

	segment "gopkg.in/segmentio/analytics-go.v3"
)

// HandleGoogleStartUser starts the oauth2 flow for a user login request.
func (app *App) HandleGoogleStartUser(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, false)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.GoogleUserConf.AuthCodeURL(state, oauth2.AccessTypeOnline)

	http.Redirect(w, r, url, 302)
}

// HandleGithubOAuthCallback verifies the callback request by checking that the
// state parameter has not been modified, and validates the token.
//
// When logging a user in, the access token gets stored in the session, and no refresh
// token is requested. We store the access token in the session because a user can be
// logged in multiple times with a single access token.
func (app *App) HandleGoogleOAuthCallback(w http.ResponseWriter, r *http.Request) {
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

	token, err := app.GoogleUserConf.Exchange(oauth2.NoContext, r.URL.Query().Get("code"))

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	if !token.Valid() {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	// create the user if not exists
	user, err := app.upsertGoogleUserFromToken(token)

	if err != nil && strings.Contains(err.Error(), "already registered") {
		http.Redirect(w, r, "/login?error="+url.QueryEscape(err.Error()), 302)
		return
	} else if err != nil && strings.Contains(err.Error(), "restricted domain group") {
		http.Redirect(w, r, "/login?error="+url.QueryEscape(err.Error()), 302)
		return
	} else if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	// send to segment
	userId := fmt.Sprintf("%v", user.ID)
	app.segmentClient.Identify(userId, user.Email, true)
	app.segmentClient.Track(userId, "New User", segment.NewProperties().Set("email", user.Email))

	// log the user in
	app.Logger.Info().Msgf("New user created: %d", user.ID)

	session.Values["authenticated"] = true
	session.Values["user_id"] = user.ID
	session.Values["email"] = user.Email
	session.Values["redirect"] = ""
	session.Save(r, w)

	if session.Values["query_params"] != "" {
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", session.Values["query_params"]), 302)
	} else {
		http.Redirect(w, r, "/dashboard", 302)
	}
}

type googleUserInfo struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	HD            string `json:"hd"`
	Sub           string `json:"sub"`
}

func (app *App) upsertGoogleUserFromToken(tok *oauth2.Token) (*models.User, error) {
	gInfo, err := getGoogleUserInfoFromToken(tok)

	if err != nil {
		return nil, err
	}

	// if the app has a restricted domain, check the `hd` query param
	if app.ServerConf.GoogleRestrictedDomain != "" {
		if gInfo.HD != app.ServerConf.GoogleRestrictedDomain {
			return nil, fmt.Errorf("Email is not in the restricted domain group.")
		}
	}

	user, err := app.Repo.User.ReadUserByGoogleUserID(gInfo.Sub)

	// if the user does not exist, create new user
	if err != nil && err == gorm.ErrRecordNotFound {
		// check if a user with that email address already exists
		_, err = app.Repo.User.ReadUserByEmail(gInfo.Email)

		if err == gorm.ErrRecordNotFound {
			user = &models.User{
				Email:         gInfo.Email,
				EmailVerified: gInfo.EmailVerified,
				GoogleUserID:  gInfo.Sub,
			}

			user, err = app.Repo.User.CreateUser(user)

			if err != nil {
				return nil, err
			}
		} else if err == nil {
			return nil, fmt.Errorf("email already registered")
		} else if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, fmt.Errorf("unexpected error occurred:%s", err.Error())
	}

	return user, nil
}

func getGoogleUserInfoFromToken(tok *oauth2.Token) (*googleUserInfo, error) {
	// use userinfo endpoint for Google OIDC to get claims
	url := "https://openidconnect.googleapis.com/v1/userinfo"

	req, err := http.NewRequest("GET", url, nil)

	req.Header.Add("Authorization", "Bearer "+tok.AccessToken)

	client := &http.Client{}

	response, err := client.Do(req)

	if err != nil {
		return nil, fmt.Errorf("failed getting user info: %s", err.Error())
	}

	defer response.Body.Close()

	contents, err := ioutil.ReadAll(response.Body)

	if err != nil {
		return nil, fmt.Errorf("failed reading response body: %s", err.Error())
	}

	// parse contents into Google userinfo claims
	gInfo := &googleUserInfo{}
	err = json.Unmarshal(contents, &gInfo)

	return gInfo, nil
}
