package utils

import (
	"github.com/itchyny/gojq"
	"github.com/porter-dev/porter/internal/templater"
)

// NewQuery constructs a templater.TemplateReaderQuery by parsing the jsonpath
// query string
func NewQuery(key, query string, defaultVal interface{}) (*templater.TemplateReaderQuery, error) {
	jquery, err := gojq.Parse(query)
	if err != nil {
		return nil, err
	}

	return &templater.TemplateReaderQuery{
		Key:         key,
		QueryString: query,
		Default:     defaultVal,
		Template:    jquery,
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
		iter := query.Template.Run(values)

		queryRes := make([]interface{}, 0)

		for {
			v, ok := iter.Next()

			if !ok {
				break
			}

			if err, ok := v.(error); ok {
				return nil, err
			}

			if v != nil {
				queryRes = append(queryRes, v)
			}
		}

		// if the length of the query result is 0, set to the default value
		if len(queryRes) == 0 {
			res[query.Key] = []interface{}{query.Default}
		} else {
			res[query.Key] = queryRes
		}
	}

	return res, nil
}
