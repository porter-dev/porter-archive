package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
)

// HandleCreateGitAction creates a new Github action in a repository for a given
// release
func (app *App) HandleCreateGitAction(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateGitAction{}

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

	// convert the form to a git action config
	gitAction, err := form.ToGitActionConfig()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// read the git repo
	gr, err := app.Repo.GitRepo.ReadGitRepo(gitAction.GitRepoID)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	repoSplit := strings.Split(gitAction.GitRepo, "/")

	if len(repoSplit) != 2 {
		app.handleErrorFormDecoding(fmt.Errorf("invalid formatting of repo name"), ErrProjectDecode, w)
		return
	}

	// get webhook token from release

	// generate porter jwt token

	// create the commit in the git repo
	_ = &actions.GithubActions{
		GitIntegration: gr,
		GitRepoName:    repoSplit[1],
		GitRepoOwner:   repoSplit[0],
		Repo:           *app.Repo,
		GithubConf:     app.GithubConf,

		// WebhookToken string
		// PorterToken  string
		// ProjectID    uint
		// ReleaseName  string

		// DockerFilePath string
		// ImageRepoURL   string

		// defaultBranch string
	}

	// handle write to the database
	// hr, err = app.Repo.HelmRepo.CreateHelmRepo(hr)

	// if err != nil {
	// 	app.handleErrorDataWrite(err, w)
	// 	return
	// }

	// app.Logger.Info().Msgf("New helm repo created: %d", hr.ID)

	// w.WriteHeader(http.StatusCreated)

	// hrExt := hr.Externalize()

	// if err := json.NewEncoder(w).Encode(hrExt); err != nil {
	// 	app.handleErrorFormDecoding(err, ErrProjectDecode, w)
	// 	return
	// }
}
