package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/porter-dev/porter/internal/helm/repo"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// HandleCreateHelmRepo creates a new helm repo for a project
func (app *App) HandleCreateHelmRepo(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateHelmRepo{
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

	// convert the form to a registry
	hr, err := form.ToHelmRepo()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	hr, err = app.Repo.HelmRepo().CreateHelmRepo(hr)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New helm repo created: %d", hr.ID)

	w.WriteHeader(http.StatusCreated)

	hrExt := hr.Externalize()

	if err := json.NewEncoder(w).Encode(hrExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListProjectHelmRepos returns a list of helm repos for a project
func (app *App) HandleListProjectHelmRepos(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	hrs, err := app.Repo.HelmRepo().ListHelmReposByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extHRs := make([]*models.HelmRepoExternal, 0)

	for _, hr := range hrs {
		extHRs = append(extHRs, hr.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extHRs); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListHelmRepoCharts lists the charts for a given linked helm repo
func (app *App) HandleListHelmRepoCharts(w http.ResponseWriter, r *http.Request) {
	helmID, err := strconv.ParseUint(chi.URLParam(r, "helm_id"), 0, 64)

	if err != nil || helmID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	hr, err := app.Repo.HelmRepo().ReadHelmRepo(uint(helmID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	// cast to a registry from registry package
	_hr := repo.HelmRepo(*hr)
	hrAPI := &_hr

	charts, err := hrAPI.ListCharts(app.Repo)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(charts); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
