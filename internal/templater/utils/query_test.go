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
		"testing": map[string]interface{}{
			"hello": "there",
		},
	}

	queries := make([]*templater.TemplateReaderQuery, 0)

	query, _ := utils.NewQuery("test", `{ .testing }`)

	queries = append(queries, query)

	res, _ := utils.QueryValues(vals, queries)

	test := &testType{
		Value: res["test"],
	}

	bytes, _ := json.Marshal(test)

	t.Errorf(string(bytes))
}
