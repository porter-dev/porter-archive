package query

import (
	"regexp"

	"github.com/porter-dev/porter/cli/cmd/switchboard/query/jsonpath"
)

// PopulateQuery reads through config to detect queries. If a query is found, the data
// is queried and the relevant field is populated in the config. This method is recursive.
func PopulateQueries(config map[string]interface{}, data map[string]interface{}) (map[string]interface{}, error) {
	iter := queryIterator{data, make([]error, 0)}
	res := iter.iterMap(config)

	return res, nil
}

type queryIterator struct {
	data   map[string]interface{}
	errors []error
}

func (q *queryIterator) iterSlice(arr []interface{}) []interface{} {
	res := make([]interface{}, 0)

	for _, arrVal := range arr {
		res = append(res, q.iterInterface(arrVal))
	}

	return res
}

func (q *queryIterator) iterMap(mapVal map[string]interface{}) map[string]interface{} {
	res := make(map[string]interface{})

	for key, val := range mapVal {
		res[key] = q.iterInterface(val)
	}

	return res
}

func (q *queryIterator) iterInterface(val interface{}) interface{} {
	switch val.(type) {
	case []interface{}:
		return q.iterSlice(val.([]interface{}))
	case map[string]interface{}:
		return q.iterMap(val.(map[string]interface{}))
	case string:
		// TODO: move out to higher-level func
		bracesReg := regexp.MustCompile(`\{(.+)\}`)

		if bracesReg.MatchString(val.(string)) {
			// get the query value from data
			res, err := jsonpath.GetResult(q.data, val.(string))

			if err != nil {
				q.errors = append(q.errors, err)
				return val
			}

			return res
		}

		return val
	default:
		return val
	}
}
