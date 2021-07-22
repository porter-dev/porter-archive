package api

import (
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/integrations/ci/actions"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gopkg.in/yaml.v2"
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
		RepoURL: app.ServerConf.DefaultApplicationHelmRepoURL,
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

	rel, err := agent.InstallChart(conf, app.DOConf)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseDeploy,
			Errors: []string{"error installing a new chart: " + err.Error()},
		}, w)

		return
	}

	token, err := repository.GenerateRandomBytes(16)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// create release with webhook token in db
	image, ok := rel.Config["image"].(map[string]interface{})
	if !ok {
		app.handleErrorInternal(fmt.Errorf("Could not find field image in config"), w)
		return
	}

	repository := image["repository"]
	repoStr, ok := repository.(string)

	if !ok {
		app.handleErrorInternal(fmt.Errorf("Could not find field repository in config"), w)
		return
	}

	release := &models.Release{
		ClusterID:    form.ReleaseForm.Form.Cluster.ID,
		ProjectID:    form.ReleaseForm.Form.Cluster.ProjectID,
		Namespace:    form.ReleaseForm.Form.Namespace,
		Name:         form.ChartTemplateForm.Name,
		WebhookToken: token,
		ImageRepoURI: repoStr,
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
			GitBranch:      form.GithubActionConfig.GitBranch,
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

		app.createGitActionFromForm(projID, release, form.ChartTemplateForm.Name, gaForm, w, r)
	}

	w.WriteHeader(http.StatusOK)
}

// HandleDeployAddon triggers a addon deployment from a template
func (app *App) HandleDeployAddon(w http.ResponseWriter, r *http.Request) {
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
		RepoURL: app.ServerConf.DefaultApplicationHelmRepoURL,
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

	w.WriteHeader(http.StatusOK)
}

// HandleUninstallTemplate triggers a chart deployment from a template
func (app *App) HandleUninstallTemplate(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

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

	resp, err := agent.UninstallChart(name)
	if err != nil {
		return
	}

	// update the github actions env if the release exists and is built from source
	if cName := resp.Release.Chart.Metadata.Name; cName == "job" || cName == "web" || cName == "worker" {
		clusterID, err := strconv.ParseUint(vals["cluster_id"][0], 10, 64)

		if err != nil {
			app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
				Code:   ErrReleaseReadData,
				Errors: []string{"release not found"},
			}, w)
		}

		release, err := app.Repo.Release.ReadRelease(uint(clusterID), name, resp.Release.Namespace)

		if release != nil {
			gitAction := release.GitActionConfig

			if gitAction.ID != 0 {
				// parse env into build env
				cEnv := &ContainerEnvConfig{}
				rawValues, err := yaml.Marshal(resp.Release.Config)

				if err != nil {
					app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
						Code:   ErrReleaseReadData,
						Errors: []string{"could not get values of previous revision"},
					}, w)
				}

				yaml.Unmarshal(rawValues, cEnv)

				gr, err := app.Repo.GitRepo.ReadGitRepo(gitAction.GithubInstallationID)

				if err != nil {
					if err != gorm.ErrRecordNotFound {
						app.handleErrorInternal(err, w)
						return
					}
					gr = nil
				}

				repoSplit := strings.Split(gitAction.GitRepo, "/")

				projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

				if err != nil || projID == 0 {
					app.handleErrorFormDecoding(err, ErrProjectDecode, w)
					return
				}

				gaRunner := &actions.GithubActions{
					ServerURL:              app.ServerConf.ServerURL,
					GithubOAuthIntegration: gr,
					GithubAppID:            app.GithubAppConf.AppID,
					GithubInstallationID:   gitAction.GithubInstallationID,
					GitRepoName:            repoSplit[1],
					GitRepoOwner:           repoSplit[0],
					Repo:                   *app.Repo,
					GithubConf:             app.GithubProjectConf,
					WebhookToken:           release.WebhookToken,
					ProjectID:              uint(projID),
					ReleaseName:            name,
					GitBranch:              gitAction.GitBranch,
					DockerFilePath:         gitAction.DockerfilePath,
					FolderPath:             gitAction.FolderPath,
					ImageRepoURL:           gitAction.ImageRepoURI,
					BuildEnv:               cEnv.Container.Env.Normal,
				}

				err = gaRunner.Cleanup()

				if err != nil {
					app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
						Code:   ErrReleaseReadData,
						Errors: []string{"could not remove github action"},
					}, w)
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	return
}
