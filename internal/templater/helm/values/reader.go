package helm

import (
	"fmt"

	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"

	"github.com/stefanmcshane/helm/pkg/chart"
	"github.com/stefanmcshane/helm/pkg/release"
)

// TemplateReader implements the templater.TemplateReader for reading from
// the Helm values.
//
// Note: ReadStream does nothing at the moment.
type TemplateReader struct {
	Queries []*templater.TemplateReaderQuery

	Release *release.Release
	Chart   *chart.Chart
}

// ValuesFromTarget returns a set of values by reading from a Helm release if set, otherwise
// a helm chart.
func (r *TemplateReader) ValuesFromTarget() (map[string]interface{}, error) {
	// if release exists, read values from release
	if r.Release != nil {
		// merge config values with overriding values
		return utils.CoalesceValues(r.Release.Chart.Values, r.Release.Config), nil
	} else if r.Chart != nil {
		return r.Chart.Values, nil
	}

	// otherwise, return the chart values
	return nil, fmt.Errorf("must set release or chart to read values")
}

// RegisterQuery adds a new query to be executed against the values
func (r *TemplateReader) RegisterQuery(query *templater.TemplateReaderQuery) error {
	r.Queries = append(r.Queries, query)

	return nil
}

// Read executes a set of queries against the helm values in the release/chart
func (r *TemplateReader) Read() (map[string]interface{}, error) {
	values, err := r.ValuesFromTarget()

	if err != nil {
		return nil, err
	}

	return utils.QueryValues(values, r.Queries)
}

// ReadStream is unimplemented: stub just to implement TemplateReader
func (r *TemplateReader) ReadStream(
	on templater.OnDataStream,
	stopCh <-chan struct{},
) error {
	return nil
}
