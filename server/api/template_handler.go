package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/templater/parser"

	"github.com/porter-dev/porter/internal/models"
)

// HandleListTemplates retrieves a list of Porter templates
// TODO: test and reduce fragility (handle untar/parse error for individual charts)
// TODO: separate markdown retrieval into its own query if necessary
func (app *App) HandleListTemplates(w http.ResponseWriter, r *http.Request) {
	// repoIndex, err := loader.LoadRepoIndex("https://porter-dev.github.io/chart-repo/index.yaml")
	repoIndex, err := loader.LoadRepoIndex("http://chartmuseum:8080/index.yaml")

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	// Loop over charts in index.yaml
	porterCharts := []models.PorterChartList{}

	for _, entry := range repoIndex.Entries {
		indexChart := entry[0]

		porterChart := models.PorterChartList{}
		porterChart.Name = indexChart.Name
		porterChart.Description = indexChart.Description
		porterChart.Icon = indexChart.Icon

		porterCharts = append(porterCharts, porterChart)
	}

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
		RepoURL: RepoURL: app.ServerConf.HelmRepoURL,
	}

	// if a repo_url is passed as query param, it will be populated
	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrReleaseDecode, w)
		return
	}

	form.PopulateRepoURLFromQueryParams(vals)

	chart, err := loader.LoadChart(form.RepoURL, form.Name, form.Version)

	if err != nil {
		fmt.Println("ERROR LOADING CHART", form.RepoURL, form.Name, form.Version, err)
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

			fmt.Println("FORM RESULT:", formYAML, err)

			if err != nil {
				break
			}

			res.Form = formYAML
		} else if strings.Contains(file.Name, "README.md") {
			res.Markdown = string(file.Data)
		}
	}

	bytesRes, _ := json.Marshal(res)

	fmt.Println("RAW RESPONSE:", string(bytesRes), res)

	json.NewEncoder(w).Encode(res)
}
