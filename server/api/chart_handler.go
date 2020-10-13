package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm"
)

// Enumeration of chart API error codes, represented as int64
const (
	ErrChartDecode ErrorCode = iota + 600
	ErrChartValidateFields
	ErrChartReadData
)

// HandleListReleases retrieves a list of releases for a cluster
// with various filter options
func (app *App) HandleListReleases(w http.ResponseWriter, r *http.Request) {
	form := &forms.ListChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		ListFilter: &helm.ListFilter{},
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ChartForm,
		form.ChartForm.PopulateHelmOptionsFromQueryParams,
		form.PopulateListFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	releases, err := agent.ListReleases(form.Namespace, form.ListFilter)

	if err != nil {
		app.handleErrorRead(err, ErrChartReadData, w)
		return
	}

	if err := json.NewEncoder(w).Encode(releases); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}
}

// HandleGetChart retrieves a single chart based on a name and revision
func (app *App) HandleGetChart(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	form := &forms.GetChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name:     name,
		Revision: int(revision),
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ChartForm,
		form.ChartForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetRelease(form.Name, form.Revision)

	if err != nil {
		app.handleErrorRead(err, ErrChartReadData, w)
		return
	}

	if err := json.NewEncoder(w).Encode(release); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}
}

// HandleListChartHistory retrieves a history of charts based on a chart name
func (app *App) HandleListChartHistory(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	form := &forms.ListChartHistoryForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name: name,
	}

	agent, err := app.getAgentFromQueryParams(
		w,
		r,
		form.ChartForm,
		form.ChartForm.PopulateHelmOptionsFromQueryParams,
	)

	// errors are handled in app.getAgentFromQueryParams
	if err != nil {
		return
	}

	release, err := agent.GetReleaseHistory(form.Name)

	if err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	if err := json.NewEncoder(w).Encode(release); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}
}

// HandleUpgradeChart upgrades a chart with new values.yaml
func (app *App) HandleUpgradeChart(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	form := &forms.UpgradeChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name: name,
	}

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromChartForm(
		w,
		r,
		form.ChartForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	_, err = agent.UpgradeChart(form.Name, form.Values)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleRollbackChart rolls a release back to a specified revision
func (app *App) HandleRollbackChart(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	form := &forms.RollbackChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name:     name,
		Revision: int(revision),
	}

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	agent, err := app.getAgentFromChartForm(
		w,
		r,
		form.ChartForm,
	)

	// errors are handled in app.getAgentFromBodyParams
	if err != nil {
		return
	}

	err = agent.RollbackRelease(form.Name, form.Revision)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// ------------------------ Release handler helper functions ------------------------ //

// getAgentFromQueryParams uses the query params to populate a form, and then
// passes that form to the underlying app.getAgentFromChartForm to create a new
// Helm agent.
func (app *App) getAgentFromQueryParams(
	w http.ResponseWriter,
	r *http.Request,
	form *forms.ChartForm,
	// populate uses the query params to populate a form
	populate ...func(vals url.Values),
) (*helm.Agent, error) {
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return nil, err
	}

	for _, f := range populate {
		f(vals)
	}

	return app.getAgentFromChartForm(w, r, form)
}

// getAgentFromChartForm uses a non-validated form to construct a new Helm agent based on
// the userID found in the session and the options required by the Helm agent.
func (app *App) getAgentFromChartForm(
	w http.ResponseWriter,
	r *http.Request,
	form *forms.ChartForm,
) (*helm.Agent, error) {
	// read the session in order to generate the Helm agent
	session, err := app.store.Get(r, app.cookieName)

	// since we have already authenticated the user, throw a data read error if the session
	// cannot be found
	if err != nil {
		app.handleErrorDataRead(err, w)
		return nil, err
	}

	if userID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateHelmOptionsFromUserID(userID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return nil, err
	}

	// create a new agent
	var agent *helm.Agent

	if app.testing {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.Form, app.logger)
	}

	return agent, err
}
