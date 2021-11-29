package jsonpath

import (
	"fmt"

	"k8s.io/client-go/util/jsonpath"
)

func GetResult(data map[string]interface{}, query string) (interface{}, error) {
	js := jsonpath.New("query")

	err := js.Parse(query)

	if err != nil {
		return nil, err
	}

	results, err := js.FindResults(data)

	if err != nil {
		return nil, err
	}

	for _, result := range results {
		for _, r := range result {
			// if this cannot be interfaced, throw an error
			if !r.CanInterface() {
				return nil, fmt.Errorf("result cannot be interfaced")
			}

			return r.Interface(), nil
		}
	}

	return nil, fmt.Errorf("no query result")
}
