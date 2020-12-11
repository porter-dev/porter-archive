package utils_test

import (
	"encoding/json"
	"testing"

	"github.com/porter-dev/porter/internal/templater"
	"github.com/porter-dev/porter/internal/templater/utils"
)

type testType struct {
	Value interface{} `json:"value,omitempty"`
}

func TestQueryValues(t *testing.T) {
	vals := map[string]interface{}{
		"items": []interface{}{
			map[string]interface{}{
				"metadata": map[string]interface{}{
					"name":      "a",
					"namespace": "velero",
				},
				"array": []interface{}{
					"1",
					"2",
				},
			},
			map[string]interface{}{
				"metadata": map[string]interface{}{
					"name":      "b",
					"namespace": "velero",
				},
				"array": []interface{}{
					"3",
					"4",
				},
			},
		},
	}

	queries := make([]*templater.TemplateReaderQuery, 0)

	// should get turned into type []map[string]interface{} that can be converted to JSON
	// query, err := utils.NewQuery("test",
	// 	`
	// .items[].metadata |
	// { name: .name, namespace: .namespace }
	// `)

	query, err := utils.NewQuery("test", `.items`)

	if err != nil {
		t.Fatalf("%v\n", err)
	}

	queries = append(queries, query)

	res, _ := utils.QueryValues(vals, queries)

	test := &testType{
		Value: res["test"],
	}

	bytes, _ := json.Marshal(test)

	t.Errorf(string(bytes))
}
