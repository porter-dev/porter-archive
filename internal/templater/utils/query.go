package utils

import (
	"fmt"
	"reflect"

	"github.com/porter-dev/porter/cli/cmd/templater"
	"k8s.io/client-go/util/jsonpath"
)

// NewQuery constructs a templater.TemplateReaderQuery by parsing the jsonpath
// query string
func NewQuery(key, query string) (*templater.TemplateReaderQuery, error) {
	j := jsonpath.New(key)
	j.AllowMissingKeys(true)

	err := j.Parse(query)

	if err != nil {
		return nil, err
	}

	return &templater.TemplateReaderQuery{
		Key:         key,
		QueryString: query,
		Template:    j,
	}, nil
}

// QueryValues iterates through a map[string]interface{} and executes a query,
// returning a map of the query name to the returned data
func QueryValues(
	values map[string]interface{},
	queries []*templater.TemplateReaderQuery,
) (map[string]interface{}, error) {
	res := make(map[string]interface{})

	// iterate through all registered queries, add to resulting map
	for _, query := range queries {
		fullResults, err := query.Template.FindResults(values)

		if err != nil {
			fmt.Printf("query error %s", err)
			continue
		}

		queryRes := make([]reflect.Value, 0)

		for ix := range fullResults {
			for _, result := range fullResults[ix] {
				queryRes = append(queryRes, reflect.ValueOf(result.Interface()))
			}
		}

		res[query.Key] = queryRes
	}

	return res, nil
}
