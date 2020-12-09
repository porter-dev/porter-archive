package templater

import (
	"k8s.io/client-go/util/jsonpath"
)

// OnDataStream is a function that gets called when new data should be
// streamed to the client. The data has the generic type map[string]interface{}.
type OnDataStream func(val map[string]interface{}) error

type TemplateReaderQuery struct {
	Key         string
	QueryString string

	Template *jsonpath.JSONPath
}

// TemplateReader retrieves data from a target data source, registers a set of
// queries against that data, and returns it via the Read() operation
type TemplateReader interface {
	ValuesFromTarget() (map[string]interface{}, error)
	RegisterQuery(query *TemplateReaderQuery) error
	Read() (map[string]interface{}, error)
	ReadStream(
		on OnDataStream,
		stopCh <-chan struct{},
	) error
}

// TemplateWriter transforms input data and writes to a deployment target
type TemplateWriter interface {
	Transform() error
	Create(vals map[string]interface{}) (map[string]interface{}, error)
	Update(vals map[string]interface{}) (map[string]interface{}, error)
}
