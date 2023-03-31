package infra

import (
	"encoding/json"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"
)

// OperationReader implements the templater.TemplateReader for reading from
// the operation values.
//
// Note: ReadStream does nothing at the moment.
type OperationReader struct {
	Queries []*templater.TemplateReaderQuery

	Operation *models.Operation
}

// ValuesFromTarget returns a set of values by reading from a Helm release if set, otherwise
// a helm chart.
func (r *OperationReader) ValuesFromTarget() (map[string]interface{}, error) {
	values := make(map[string]interface{})

	err := json.Unmarshal([]byte(r.Operation.LastApplied), &values)
	if err != nil {
		return nil, err
	}

	return values, nil
}

// RegisterQuery adds a new query to be executed against the values
func (r *OperationReader) RegisterQuery(query *templater.TemplateReaderQuery) error {
	r.Queries = append(r.Queries, query)

	return nil
}

// Read executes a set of queries against the operation values
func (r *OperationReader) Read() (map[string]interface{}, error) {
	values, err := r.ValuesFromTarget()
	if err != nil {
		return nil, err
	}

	return utils.QueryValues(values, r.Queries)
}

// ReadStream is unimplemented: stub just to implement TemplateReader
func (r *OperationReader) ReadStream(
	on templater.OnDataStream,
	stopCh <-chan struct{},
) error {
	return nil
}
