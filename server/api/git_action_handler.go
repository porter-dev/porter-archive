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
		ReleaseID: release.Model.ID,
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	gaExt := app.createGitActionFromForm(projID, release, name, form, w, r)

	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(gaExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

func (app *App) createGitActionFromForm(
	projID uint64,
	release *models.Release,
	name string,
	form *forms.CreateGitAction,
	w http.ResponseWriter,
	r *http.Request,
) *models.GitActionConfigExternal {
	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return nil
	}

	// if the registry was provisioned through Porter, create a repository if necessary
	if form.RegistryID != 0 {
		// read the registry
		reg, err := app.Repo.Registry.ReadRegistry(form.RegistryID)

		if err != nil {
			app.handleErrorDataRead(err, w)
			return nil
		}

		_reg := registry.Registry(*reg)
		regAPI := &_reg

		// parse the name from the registry
		nameSpl := strings.Split(form.ImageRepoURI, "/")
		repoName := nameSpl[len(nameSpl)-1]

		err = regAPI.CreateRepository(*app.Repo, repoName)

		if err != nil {
			app.handleErrorInternal(err, w)
			return nil
		}
	}

	// convert the form to a git action config
	gitAction, err := form.ToGitActionConfig()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return nil
	}

	// read the git repo
	gr, err := app.Repo.GitRepo.ReadGitRepo(gitAction.GitRepoID)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return nil
	}

	repoSplit := strings.Split(gitAction.GitRepo, "/")

	if len(repoSplit) != 2 {
		app.handleErrorFormDecoding(fmt.Errorf("invalid formatting of repo name"), ErrProjectDecode, w)
		return nil
	}

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return nil
	}

	userID, _ := session.Values["user_id"].(uint)

	// generate porter jwt token
	jwt, _ := token.GetTokenForAPI(userID, uint(projID))

	encoded, err := jwt.EncodeToken(&token.TokenGeneratorConf{
		TokenSecret: app.ServerConf.TokenGeneratorSecret,
	})

	if err != nil {
		app.handleErrorInternal(err, w)
		return nil
	}

	// create the commit in the git repo
	gaRunner := &actions.GithubActions{
		GitIntegration: gr,
		GitRepoName:    repoSplit[1],
		GitRepoOwner:   repoSplit[0],
		Repo:           *app.Repo,
		GithubConf:     app.GithubProjectConf,
		WebhookToken:   release.WebhookToken,
		ProjectID:      uint(projID),
		ReleaseName:    name,
		DockerFilePath: gitAction.DockerfilePath,
		FolderPath:     gitAction.FolderPath,
		ImageRepoURL:   gitAction.ImageRepoURI,
		PorterToken:    encoded,
		BuildEnv:       form.BuildEnv,
	}

	_, err = gaRunner.Setup()

	if err != nil {
		app.handleErrorInternal(err, w)
		return nil
	}

	// handle write to the database
	ga, err := app.Repo.GitActionConfig.CreateGitActionConfig(gitAction)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return nil
	}

	app.Logger.Info().Msgf("New git action created: %d", ga.ID)

	return ga.Externalize()
}
