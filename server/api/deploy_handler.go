package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
)

// HandleDeployTemplate triggers a chart deployment from a template
func (app *App) HandleDeployTemplate(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	name := chi.URLParam(r, "name")
	version := chi.URLParam(r, "version")

	// if version passed as latest, pass empty string to loader to get latest
	if version == "latest" {
		version = ""
	}

	getChartForm := &forms.ChartForm{
		Name:    name,
		Version: version,
		RepoURL: app.ServerConf.DefaultHelmRepoURL,
	}

	// if a repo_url is passed as query param, it will be populated
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	getChartForm.PopulateRepoURLFromQueryParams(vals)

	chart, err := loader.LoadChartPublic(getChartForm.RepoURL, getChartForm.Name, getChartForm.Version)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form := &forms.InstallChartTemplateForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo:              app.Repo,
				DigitalOceanOAuth: app.DOConf,
			},
		},
		ChartTemplateForm: &forms.ChartTemplateForm{},
	}

	form.ReleaseForm.PopulateHelmOptionsFromQueryParams(
		vals,
		app.Repo.Cluster,
	)

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromReleaseForm(
		w,
		r,
		form.ReleaseForm,
	)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	registries, err := app.Repo.Registry.ListRegistriesByProjectID(uint(projID))

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       form.ChartTemplateForm.Name,
		Namespace:  form.ReleaseForm.Form.Namespace,
		Values:     form.ChartTemplateForm.FormValues,
		Cluster:    form.ReleaseForm.Cluster,
		Repo:       *app.Repo,
		Registries: registries,
	}

	_, err = agent.InstallChart(conf, app.DOConf)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error installing a new chart: " + err.Error()},
		}, w)

		return
	}

	// generate 8 characters long webhook token.
	const letters = "abcdefghijklmnopqrstuvwxyz"
	token := make([]byte, 8)
	for i := range token {
		token[i] = letters[rand.Intn(len(letters))]
	}

	// create release with webhook token in db
	release := &models.Release{
		ClusterID:    form.ReleaseForm.Form.Cluster.ID,
		ProjectID:    form.ReleaseForm.Form.Cluster.ProjectID,
		Namespace:    form.ReleaseForm.Form.Namespace,
		Name:         form.ChartTemplateForm.Name,
		WebhookToken: string(token),
	}

	_, err = app.Repo.Release.CreateRelease(release)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error creating a webhook: " + err.Error()},
		}, w)
	}

	// if github action config is linked, call the github action config handler
	if form.GithubActionConfig != nil {
		gaForm := &forms.CreateGitAction{
			ReleaseID:      release.ID,
			GitRepo:        form.GithubActionConfig.GitRepo,
			ImageRepoURI:   form.GithubActionConfig.ImageRepoURI,
			DockerfilePath: form.GithubActionConfig.DockerfilePath,
			GitRepoID:      form.GithubActionConfig.GitRepoID,
			BuildEnv:       form.GithubActionConfig.BuildEnv,
			RegistryID:     form.GithubActionConfig.RegistryID,
		}

		// validate the form
		if err := app.validator.Struct(form); err != nil {
			app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
			return
		}

		app.createGitActionFromForm(projID, release, name, gaForm, w, r)
	}

	w.WriteHeader(http.StatusOK)
}

// HandleUninstallTemplate triggers a chart deployment from a template
func (app *App) HandleUninstallTemplate(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	form := &forms.GetReleaseForm{
		ReleaseForm: &forms.ReleaseForm{
			Form: &helm.Form{
				Repo: app.Repo,
			},
		},
		Name: name,
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ReleaseForm,
		form.ReleaseForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	_, err = agent.UninstallChart(name)
	if err != nil {
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}
