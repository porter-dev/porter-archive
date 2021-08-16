package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/registry"
)

const (
	updateAppActionVersion = "v0.1.0"
)

// HandleGenerateGitAction returns the Github action that will be created in a repository
// for a given release
func (app *App) HandleGenerateGitAction(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 10, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)
	name := vals["name"][0]

	clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)
	}

	form := &forms.CreateGitAction{
		ShouldGenerateOnly: true,
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	_, workflowYAML := app.createGitActionFromForm(projID, clusterID, name, form, w, r)

	w.WriteHeader(http.StatusOK)

	if _, err := w.Write(workflowYAML); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleCreateGitAction creates a new Github action in a repository for a given
// release
func (app *App) HandleCreateGitAction(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)
	name := vals["name"][0]
	namespace := vals["namespace"][0]

	clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)
	}

	release, err := app.Repo.Release.ReadRelease(uint(clusterID), name, namespace)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)
	}

	form := &forms.CreateGitAction{
		Release:            release,
		ShouldGenerateOnly: false,
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	gaExt, _ := app.createGitActionFromForm(projID, clusterID, name, form, w, r)

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(gaExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

func (app *App) createGitActionFromForm(
	projID,
	clusterID uint64,
	name string,
	form *forms.CreateGitAction,
	w http.ResponseWriter,
	r *http.Request,
) (gaExt *models.GitActionConfigExternal, workflowYAML []byte) {
	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// if the registry was provisioned through Porter, create a repository if necessary
	if form.RegistryID != 0 {
		// read the registry
		reg, err := app.Repo.Registry.ReadRegistry(form.RegistryID)

		if err != nil {
			app.handleErrorDataRead(err, w)
			return
		}

		_reg := registry.Registry(*reg)
		regAPI := &_reg

		// parse the name from the registry
		nameSpl := strings.Split(form.ImageRepoURI, "/")
		repoName := nameSpl[len(nameSpl)-1]

		err = regAPI.CreateRepository(*app.Repo, repoName)

		if err != nil {
			app.handleErrorInternal(err, w)
			return
		}
	}

	repoSplit := strings.Split(form.GitRepo, "/")

	if len(repoSplit) != 2 {
		app.handleErrorFormDecoding(fmt.Errorf("invalid formatting of repo name"), ErrProjectDecode, w)
		return
	}

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	if userID == 0 {
		tok := app.getTokenFromRequest(r)

		if tok != nil && tok.IBy != 0 {
			userID = tok.IBy
		} else if tok == nil || tok.IBy == 0 {
			http.Error(w, "no user id found in request", http.StatusInternalServerError)
			return
		}
	}

	// generate porter jwt token
	jwt, _ := token.GetTokenForAPI(userID, uint(projID))

	encoded, err := jwt.EncodeToken(&token.TokenGeneratorConf{
		TokenSecret: app.ServerConf.TokenGeneratorSecret,
	})

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// create the commit in the git repo
	gaRunner := &actions.GithubActions{
		ServerURL:              app.ServerConf.ServerURL,
		GithubOAuthIntegration: nil,
		GithubAppID:            app.GithubAppConf.AppID,
		GithubAppSecretPath:    app.GithubAppConf.SecretPath,
		GithubInstallationID:   form.GitRepoID,
		GitRepoName:            repoSplit[1],
		GitRepoOwner:           repoSplit[0],
		Repo:                   *app.Repo,
		GithubConf:             app.GithubProjectConf,
		ProjectID:              uint(projID),
		ClusterID:              uint(clusterID),
		ReleaseName:            name,
		GitBranch:              form.GitBranch,
		DockerFilePath:         form.DockerfilePath,
		FolderPath:             form.FolderPath,
		ImageRepoURL:           form.ImageRepoURI,
		PorterToken:            encoded,
		Version:                updateAppActionVersion,
		ShouldGenerateOnly:     form.ShouldGenerateOnly,
		ShouldCreateWorkflow:   form.ShouldCreateWorkflow,
	}

	workflowYAML, err = gaRunner.Setup()

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if form.Release == nil {
		return
	}

	// convert the form to a git action config
	gitAction, err := form.ToGitActionConfig(gaRunner.Version)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	ga, err := app.Repo.GitActionConfig.CreateGitActionConfig(gitAction)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New git action created: %d", ga.ID)

	// update the release in the db with the image repo uri
	form.Release.ImageRepoURI = gitAction.ImageRepoURI

	_, err = app.Repo.Release.UpdateRelease(form.Release)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	gaExt = ga.Externalize()

	return
}
