package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/google/go-github/github"
	"github.com/porter-dev/porter/internal/oauth"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
	"io/ioutil"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"

	"github.com/porter-dev/porter/internal/models/integrations"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// HandleListClusterIntegrations lists the cluster integrations available to the
// instance
func (app *App) HandleListClusterIntegrations(w http.ResponseWriter, r *http.Request) {
	clusters := ints.PorterClusterIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&clusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRegistryIntegrations lists the image registry integrations available to the
// instance
func (app *App) HandleListRegistryIntegrations(w http.ResponseWriter, r *http.Request) {
	registries := ints.PorterRegistryIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&registries); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListHelmRepoIntegrations lists the Helm repo integrations available to the
// instance
func (app *App) HandleListHelmRepoIntegrations(w http.ResponseWriter, r *http.Request) {
	hrs := ints.PorterHelmRepoIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&hrs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRepoIntegrations lists the repo integrations available to the
// instance
func (app *App) HandleListRepoIntegrations(w http.ResponseWriter, r *http.Request) {
	repos := ints.PorterGitRepoIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&repos); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateGCPIntegration creates a new GCP integration in the DB
func (app *App) HandleCreateGCPIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateGCPIntegrationForm{
		UserID:    userID,
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to a gcp integration
	gcp, err := form.ToGCPIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	gcp, err = app.Repo.GCPIntegration.CreateGCPIntegration(gcp)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New gcp integration created: %d", gcp.ID)

	w.WriteHeader(http.StatusCreated)

	gcpExt := gcp.Externalize()

	if err := json.NewEncoder(w).Encode(gcpExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateAWSIntegration creates a new AWS integration in the DB
func (app *App) HandleCreateAWSIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateAWSIntegrationForm{
		UserID:    userID,
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to a aws integration
	aws, err := form.ToAWSIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	aws, err = app.Repo.AWSIntegration.CreateAWSIntegration(aws)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New aws integration created: %d", aws.ID)

	w.WriteHeader(http.StatusCreated)

	awsExt := aws.Externalize()

	if err := json.NewEncoder(w).Encode(awsExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleOverwriteAWSIntegration overwrites the ID of an AWS integration in the DB
func (app *App) HandleOverwriteAWSIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	awsIntegrationID, err := strconv.ParseUint(chi.URLParam(r, "aws_integration_id"), 0, 64)

	if err != nil || awsIntegrationID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.OverwriteAWSIntegrationForm{
		UserID:    userID,
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// read the aws integration by ID and overwrite the access id/secret
	awsIntegration, err := app.Repo.AWSIntegration.ReadAWSIntegration(uint(awsIntegrationID))

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	awsIntegration.AWSAccessKeyID = []byte(form.AWSAccessKeyID)
	awsIntegration.AWSSecretAccessKey = []byte(form.AWSSecretAccessKey)

	// handle write to the database
	awsIntegration, err = app.Repo.AWSIntegration.OverwriteAWSIntegration(awsIntegration)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// clear the cluster token cache if cluster_id exists
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	if len(vals["cluster_id"]) > 0 {
		clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}

		cluster, err := app.Repo.Cluster.ReadCluster(uint(clusterID))

		// clear the token
		cluster.TokenCache.Token = []byte("")

		cluster, err = app.Repo.Cluster.UpdateClusterTokenCache(&cluster.TokenCache)

		if err != nil {
			app.handleErrorDataWrite(err, w)
			return
		}
	}

	app.Logger.Info().Msgf("AWS integration overwritten: %d", awsIntegration.ID)

	w.WriteHeader(http.StatusCreated)

	awsExt := awsIntegration.Externalize()

	if err := json.NewEncoder(w).Encode(awsExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateBasicAuthIntegration creates a new basic auth integration in the DB
func (app *App) HandleCreateBasicAuthIntegration(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateBasicAuthIntegrationForm{
		UserID:    userID,
		ProjectID: uint(projID),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to a gcp integration
	basic, err := form.ToBasicIntegration()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	basic, err = app.Repo.BasicIntegration.CreateBasicIntegration(basic)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New basic integration created: %d", basic.ID)

	w.WriteHeader(http.StatusCreated)

	basicExt := basic.Externalize()

	if err := json.NewEncoder(w).Encode(basicExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectOAuthIntegrations lists the oauth integrations for the project
func (app *App) HandleListProjectOAuthIntegrations(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	oauthInts, err := app.Repo.OAuthIntegration.ListOAuthIntegrationsByProjectID(uint(projID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	res := make([]*integrations.OAuthIntegrationExternal, 0)

	for _, oauthInt := range oauthInts {
		res = append(res, oauthInt.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(res); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// verifySignature verifies a signature based on hmac protocal
// https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
func verifySignature(secret []byte, signature string, body []byte) bool {
	if len(signature) != 71 || !strings.HasPrefix(signature, "sha256=") {
		return false
	}

	actual := make([]byte, 32)
	hex.Decode(actual, []byte(signature[7:]))

	computed := hmac.New(sha256.New, secret)
	computed.Write(body)

	return hmac.Equal(computed.Sum(nil), actual)
}

func (app *App) HandleGithubAppEvent(w http.ResponseWriter, r *http.Request) {
	payload, err := ioutil.ReadAll(r.Body)
	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// verify webhook secret
	signature := r.Header.Get("X-Hub-Signature-256")

	if !verifySignature([]byte(app.GithubAppConf.WebhookSecret), signature, payload) {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	event, err := github.ParseWebHook(github.WebHookType(r), payload)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	switch e := event.(type) {
	case *github.InstallationEvent:
		if *e.Action == "created" {
			_, err := app.Repo.GithubAppInstallation.ReadGithubAppInstallationByAccountID(*e.Installation.Account.ID)

			if err != nil && err == gorm.ErrRecordNotFound {
				// insert account/installation pair into database
				_, err := app.Repo.GithubAppInstallation.CreateGithubAppInstallation(&ints.GithubAppInstallation{
					AccountID:      *e.Installation.Account.ID,
					InstallationID: *e.Installation.ID,
				})

				if err != nil {
					app.handleErrorInternal(err, w)
				}

				return
			} else if err != nil {
				app.handleErrorInternal(err, w)
				return
			}
		}
		if *e.Action == "deleted" {
			err := app.Repo.GithubAppInstallation.DeleteGithubAppInstallationByAccountID(*e.Installation.Account.ID)

			if err != nil {
				app.handleErrorInternal(err, w)
				return
			}
		}
	}

}

// HandleGithubAppAuthorize starts the oauth2 flow for a project repo request.
func (app *App) HandleGithubAppAuthorize(w http.ResponseWriter, r *http.Request) {
	state := oauth.CreateRandomState()

	err := app.populateOAuthSession(w, r, state, false)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// specify access type offline to get a refresh token
	url := app.GithubAppConf.AuthCodeURL(state, oauth2.AccessTypeOffline)

	http.Redirect(w, r, url, 302)
}

// HandleGithubAppInstall redirects the user to the Porter github app installation page
func (app *App) HandleGithubAppInstall(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, fmt.Sprintf("https://github.com/apps/%s/installations/new", app.GithubAppConf.AppName), 302)
}

// HandleListGithubAppAccessResp is the response returned by HandleListGithubAppAccess
type HandleListGithubAppAccessResp struct {
	HasAccess bool     `json:"has_access"`
	LoginName string   `json:"username,omitempty"`
	Accounts  []string `json:"accounts,omitempty"`
}

// HandleListGithubAppAccess provides basic info on if the current user is authenticated through the GitHub app
// and what accounts/organizations their authentication has access to
func (app *App) HandleListGithubAppAccess(w http.ResponseWriter, r *http.Request) {
	tok, err := app.getGithubUserTokenFromRequest(r)

	if err != nil {
		res := HandleListGithubAppAccessResp{
			HasAccess: false,
		}
		json.NewEncoder(w).Encode(res)
		return
	}

	client := github.NewClient(app.GithubProjectConf.Client(oauth2.NoContext, tok))

	opts := &github.ListOptions{
		PerPage: 100,
		Page:    1,
	}

	res := HandleListGithubAppAccessResp{
		HasAccess: true,
	}

	for {
		orgs, pages, err := client.Organizations.List(context.Background(), "", opts)

		if err != nil {
			res := HandleListGithubAppAccessResp{
				HasAccess: false,
			}
			json.NewEncoder(w).Encode(res)
			return
		}

		for _, org := range orgs {
			res.Accounts = append(res.Accounts, *org.Login)
		}

		if pages.NextPage == 0 {
			break
		}
	}

	AuthUser, _, err := client.Users.Get(context.Background(), "")

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	res.LoginName = *AuthUser.Login

	// check if user has app installed in their account
	Installation, err := app.Repo.GithubAppInstallation.ReadGithubAppInstallationByAccountID(*AuthUser.ID)

	if err != nil && err != gorm.ErrRecordNotFound {
		app.handleErrorInternal(err, w)
		return
	}

	if Installation != nil {
		res.Accounts = append(res.Accounts, *AuthUser.Login)
	}

	sort.Strings(res.Accounts)

	json.NewEncoder(w).Encode(res)
}

// getGithubUserTokenFromRequest
func (app *App) getGithubUserTokenFromRequest(r *http.Request) (*oauth2.Token, error) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		return nil, err
	}

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		return nil, err
	}

	oauthInt, err := app.Repo.GithubAppOAuthIntegration.ReadGithubAppOauthIntegration(user.GithubAppIntegrationID)

	if err != nil {
		return nil, err
	}

	return &oauth2.Token{
		AccessToken:  string(oauthInt.AccessToken),
		RefreshToken: string(oauthInt.RefreshToken),
		TokenType:    "Bearer",
	}, nil
}
