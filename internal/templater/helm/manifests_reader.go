package helm

import (
	"fmt"
	"strings"

	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"
	"helm.sh/helm/v3/pkg/release"
	"sigs.k8s.io/yaml"
)

// ManifestsTemplateReader implements the TemplateReader for reading from
// the Helm manifests of a given release.
//
// Note: ReadStream does nothing at the moment.
type ManifestsTemplateReader struct {
	Queries []*templater.TemplateReaderQuery

	Release *release.Release
}

// ValuesFromTarget returns a set of values by reading from the Helm release's manifest,
// unmarshaling from the bytes
func (r *ManifestsTemplateReader) ValuesFromTarget() (map[string]interface{}, error) {
	if r.Release == nil {
		return nil, fmt.Errorf("must set release to read manifest")
	}

	res := make(map[string]interface{})

	manifests := strings.Split(r.Release.Manifest, "---")
	manifestArr := make([]map[string]interface{}, 0)

	for _, manifest := range manifests {
		man := make(map[string]interface{})

		err := yaml.Unmarshal([]byte(manifest), &man)

		if err != nil {
			return nil, err
		}

		manifestArr = append(manifestArr, man)
	}

	// set the array to the "manifests" field
	res["manifests"] = manifestArr

	return res, nil
}

// RegisterQuery adds a new query to be executed against the values
func (r *ManifestsTemplateReader) RegisterQuery(query *templater.TemplateReaderQuery) error {
	r.Queries = append(r.Queries, query)

	return nil
}

// Read executes a set of queries against the helm values in the release/chart
func (r *ManifestsTemplateReader) Read() (map[string]interface{}, error) {
	values, err := r.ValuesFromTarget()

	if err != nil {
		return nil, err
	}

	return utils.QueryValues(values, r.Queries)
}

// ReadStream is unimplemented: stub just to implement TemplateReader
func (r *ManifestsTemplateReader) ReadStream(
	on templater.OnDataStream,
	stopCh <-chan struct{},
) error {
	return nil
}
