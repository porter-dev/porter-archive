package api

import (
	"encoding/json"
	"fmt"
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
)

// HandleListCharts retrieves a list of charts with various filter options
func (app *App) HandleListCharts(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	// get the filter options
	form := &forms.ListChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		ListFilter: &helm.ListFilter{},
	}
	form.PopulateListFromQueryParams(vals)

	if sessID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateHelmOptionsFromUserID(sessID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	var agent *helm.Agent

	if app.testing {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.ChartForm.Form, app.logger)
	}

	releases, err := agent.ListReleases(form.Namespace, form.ListFilter)

	if err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	if err := json.NewEncoder(w).Encode(releases); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}
}

// HandleGetChart retrieves a single chart based on a name and revision
func (app *App) HandleGetChart(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	// get the filter options
	form := &forms.GetChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name:     name,
		Revision: int(revision),
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	form.PopulateHelmOptionsFromQueryParams(vals)

	if sessID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateHelmOptionsFromUserID(sessID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	var agent *helm.Agent

	if app.testing {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.ChartForm.Form, app.logger)
	}

	release, err := agent.GetRelease(form.Name, form.Revision)

	if err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	if err := json.NewEncoder(w).Encode(release); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}
}

// HandleListChartHistory retrieves a history of charts based on a chart name
func (app *App) HandleListChartHistory(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	name := chi.URLParam(r, "name")

	// get the filter options
	form := &forms.ListChartHistoryForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name: name,
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	form.PopulateHelmOptionsFromQueryParams(vals)

	if sessID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateHelmOptionsFromUserID(sessID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	var agent *helm.Agent

	if app.testing {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.ChartForm.Form, app.logger)
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

// HandleRollbackChart rolls a release back to a specified revision
func (app *App) HandleRollbackChart(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	// get the filter options
	form := &forms.GetChartForm{
		ChartForm: &forms.ChartForm{
			Form: &helm.Form{},
		},
		Name:     name,
		Revision: int(revision),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	if sessID, ok := session.Values["user_id"].(uint); ok {
		form.PopulateHelmOptionsFromUserID(sessID, app.repo.User)
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	var agent *helm.Agent

	if app.testing {
		agent = app.TestAgents.HelmAgent
	} else {
		agent, err = helm.GetAgentOutOfClusterConfig(form.ChartForm.Form, app.logger)
	}

	release, err := agent.GetRelease("wordpress", 1)

	fmt.Println("RELEASE IS", release, err.Error())

	// err = agent.RollbackRelease(form.Name, form.Revision)

	// if err != nil {
	// 	app.handleErrorInternal(err, w)
	// 	return
	// }

	w.WriteHeader(http.StatusOK)
}
