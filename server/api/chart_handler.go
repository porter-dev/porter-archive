package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
)

// Enumeration of chart API error codes, represented as int64
const (
	ErrChartDecode ErrorCode = iota + 600
	ErrChartValidateFields
)

// HandleListCharts retrieves a list of charts with various filter options
func (app *App) HandleListCharts(w http.ResponseWriter, r *http.Request) {
	// get the filter options
	form := &forms.ListChartForm{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	form.PopulateHelmOptions(app.repo.User)

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	agent, err := form.HelmOptions.ToAgent(app.logger, app.helmConf, app.HelmTestStorageDriver)

	releases, err := agent.ListReleases(form.HelmOptions.Namespace, form.ListFilter)

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
	name := chi.URLParam(r, "name")
	revision, err := strconv.ParseUint(chi.URLParam(r, "revision"), 0, 64)

	// decode from JSON to form value
	if err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	// get the filter options
	form := &forms.GetChartForm{
		Name:     name,
		Revision: int(revision),
	}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrChartDecode, w)
		return
	}

	form.PopulateHelmOptions(app.repo.User)

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrChartValidateFields, w)
		return
	}

	// create a new agent
	agent, err := form.HelmOptions.ToAgent(app.logger, app.helmConf, app.HelmTestStorageDriver)

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
