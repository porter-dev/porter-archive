package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/helm/upgrade"
	"github.com/porter-dev/porter/internal/templater/parser"

	"github.com/porter-dev/porter/internal/models"
)

// HandleListTemplates retrieves a list of Porter templates
// TODO: test and reduce fragility (handle untar/parse error for individual charts)
// TODO: separate markdown retrieval into its own query if necessary
func (app *App) HandleListTemplates(w http.ResponseWriter, r *http.Request) {

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	repoURL := app.ServerConf.DefaultApplicationHelmRepoURL

	if inputRepoURL, ok := vals["repo_url"]; ok && len(inputRepoURL) == 1 {
		repoURL = inputRepoURL[0]
	}

	repoIndex, err := loader.LoadRepoIndexPublic(repoURL)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	porterCharts := loader.RepoIndexToPorterChartList(repoIndex)

	json.NewEncoder(w).Encode(porterCharts)
}

// HandleReadTemplate reads a given template with name and version field
func (app *App) HandleReadTemplate(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	version := chi.URLParam(r, "version")

	// if version passed as latest, pass empty string to loader to get latest
	if version == "latest" {
		version = ""
	}

	form := &forms.ChartForm{
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

	form.PopulateRepoURLFromQueryParams(vals)

	chart, err := loader.LoadChartPublic(form.RepoURL, form.Name, form.Version)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	parserDef := &parser.ClientConfigDefault{
		HelmChart: chart,
	}

	res := &models.PorterChartRead{}
	res.Metadata = chart.Metadata
	res.Values = chart.Values

	for _, file := range chart.Files {
		if strings.Contains(file.Name, "form.yaml") {
			formYAML, err := parser.FormYAMLFromBytes(parserDef, file.Data, "declared")

			if err != nil {
				break
			}

			res.Form = formYAML
		} else if strings.Contains(file.Name, "README.md") {
			res.Markdown = string(file.Data)
		}
	}

	json.NewEncoder(w).Encode(res)
}

// HandleGetTemplateUpgradeNotes gets the upgrade notes for a template
func (app *App) HandleGetTemplateUpgradeNotes(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	version := chi.URLParam(r, "version")

	// if version passed as latest, pass empty string to loader to get latest
	if version == "latest" {
		version = ""
	}

	form := &forms.ChartForm{
		Name:    name,
		Version: version,
		RepoURL: app.ServerConf.DefaultApplicationHelmRepoURL,
	}

	// look for the prev_version in the query params
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form.PopulateRepoURLFromQueryParams(vals)

	prevVersion := "v0.0.0"

	if prevVersionArr, ok := vals["prev_version"]; ok && len(prevVersionArr) == 1 {
		prevVersion = prevVersionArr[0]
	}

	chart, err := loader.LoadChartPublic(form.RepoURL, form.Name, form.Version)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	res := &upgrade.UpgradeFile{}

	for _, file := range chart.Files {
		if strings.Contains(file.Name, "upgrade.yaml") {
			upgradeFile, err := upgrade.ParseUpgradeFileFromBytes(file.Data)

			if err != nil {
				break
			}

			upgradeFile, err = upgradeFile.GetUpgradeFileBetweenVersions(prevVersion, version)

			if err != nil {
				break
			}

			res = upgradeFile
		}
	}

	json.NewEncoder(w).Encode(res)
}
