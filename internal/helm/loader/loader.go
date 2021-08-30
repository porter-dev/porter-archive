package loader

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"

	"k8s.io/helm/pkg/repo"
	"sigs.k8s.io/yaml"

	"github.com/porter-dev/porter/api/types"
	"helm.sh/helm/v3/pkg/chart"
	chartloader "helm.sh/helm/v3/pkg/chart/loader"
)

// RepoIndexToPorterChartList converts an index file to a list of porter charts
func RepoIndexToPorterChartList(index *repo.IndexFile) types.ListTemplatesResponse {
	// sort the entries before parsing
	index.SortEntries()

	porterCharts := make(types.ListTemplatesResponse, 0)

	for _, entryVersions := range index.Entries {
		indexChart := entryVersions[0]
		versions := make([]string, 0)

		for _, entryVersion := range entryVersions {
			versions = append(versions, entryVersion.Version)
		}

		porterChart := types.PorterTemplateSimple{
			Name:        indexChart.Name,
			Description: indexChart.Description,
			Icon:        indexChart.Icon,
			Versions:    versions,
		}

		porterCharts = append(porterCharts, porterChart)
	}

	return porterCharts
}

// FindPorterChartInIndexList finds a chart by name given an index file and returns it
func FindPorterChartInIndexList(index *repo.IndexFile, name string) *types.PorterTemplateSimple {
	// sort the entries before parsing
	index.SortEntries()

	for _, entryVersions := range index.Entries {
		indexChart := entryVersions[0]

		if indexChart.Name == name {
			versions := make([]string, 0)

			for _, entryVersion := range entryVersions {
				versions = append(versions, entryVersion.Version)
			}

			return &types.PorterTemplateSimple{
				Name:        indexChart.Name,
				Description: indexChart.Description,
				Icon:        indexChart.Icon,
				Versions:    versions,
			}
		}
	}

	return nil
}

// BasicAuthClient is just a username/password to set on requests
type BasicAuthClient struct {
	Username string
	Password string
}

// LoadRepoIndex uses an http request to get the index file and loads it
func LoadRepoIndex(client *BasicAuthClient, repoURL string) (*repo.IndexFile, error) {
	trimmedRepoURL := strings.TrimSuffix(strings.TrimSpace(repoURL), "/")
	indexURL := trimmedRepoURL + "/index.yaml"

	req, err := http.NewRequest("GET", indexURL, nil)

	if err != nil {
		return nil, err
	}

	if client.Username != "" {
		req.SetBasicAuth(client.Username, client.Password)
	}

	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	// index not found in the cache, parse it
	index := &repo.IndexFile{}
	err = yaml.Unmarshal(data, index)

	if err != nil {
		return index, err
	}

	index.SortEntries()

	return index, nil
}

// LoadRepoIndexPublic loads an index file from a remote public Helm repo
func LoadRepoIndexPublic(repoURL string) (*repo.IndexFile, error) {
	return LoadRepoIndex(&BasicAuthClient{}, repoURL)
}

// LoadChart uses an http request to fetch a chart from a remote Helm repo
func LoadChart(client *BasicAuthClient, repoURL, chartName, chartVersion string) (*chart.Chart, error) {
	repoIndex, err := LoadRepoIndex(client, repoURL)

	if err != nil {
		return nil, err
	}

	cv, err := repoIndex.Get(chartName, chartVersion)

	if err != nil {
		return nil, err
	} else if len(cv.URLs) == 0 {
		return nil, fmt.Errorf("%s:%s no valid download urls", chartName, chartVersion)
	}

	trimmedRepoURL := strings.TrimSuffix(strings.TrimSpace(repoURL), "/")
	chartURL := trimmedRepoURL + "/" + strings.TrimPrefix(cv.URLs[0], "/")

	// download tgz
	req, err := http.NewRequest("GET", chartURL, nil)

	if err != nil {
		return nil, err
	}

	if client.Username != "" {
		req.SetBasicAuth(client.Username, client.Password)
	}

	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	data, err := ioutil.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	return chartloader.LoadArchive(bytes.NewReader(data))
}

// LoadChartPublic returns a Helm3 (v2) chart from a remote public repo.
// If chartVersion is an empty string, the most stable latest version is found.
//
// TODO: this is an expensive operation, so after retrieving the digest from the
// repo index, this should check the digest in the cache
func LoadChartPublic(repoURL, chartName, chartVersion string) (*chart.Chart, error) {
	return LoadChart(&BasicAuthClient{}, repoURL, chartName, chartVersion)
}
