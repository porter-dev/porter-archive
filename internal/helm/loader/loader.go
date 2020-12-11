package loader

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"

	"k8s.io/helm/pkg/repo"
	"sigs.k8s.io/yaml"

	"helm.sh/helm/v3/pkg/chart"
	chartloader "helm.sh/helm/v3/pkg/chart/loader"
)

// LoadRepoIndex loads an index file from a remote Helm repo
func LoadRepoIndex(indexURL string) (*repo.IndexFile, error) {
	resp, err := http.Get(indexURL)

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

// LoadChart returns a Helm3 (v2) chart from a remote repo. If chartVersion is an
// empty string, the most stable latest version is found.
//
// TODO: this is an expensive operation, so after retrieving the digest from the
// repo index, this should check the digest in the cache
func LoadChart(repoURL, chartName, chartVersion string) (*chart.Chart, error) {
	trimmedRepoURL := strings.TrimSuffix(strings.TrimSpace(repoURL), "/")
	repoIndex, err := LoadRepoIndex(trimmedRepoURL + "/index.yaml")

	if err != nil {
		return nil, err
	}

	cv, err := repoIndex.Get(chartName, chartVersion)

	if err != nil {
		return nil, err
	} else if len(cv.URLs) == 0 {
		return nil, fmt.Errorf("%s:%s no valid download urls", chartName, chartVersion)
	}

	chartURL := trimmedRepoURL + "/" + strings.TrimPrefix(cv.URLs[0], "/")

	fmt.Println(chartURL)

	// download tgz
	resp, err := http.Get(chartURL)

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
