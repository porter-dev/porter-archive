package preview

import (
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v5"
	_ "github.com/santhosh-tekuri/jsonschema/v5/httploader"
)

func validateWebChartValues(values map[string]interface{}) error {
	compiler := jsonschema.NewCompiler()

	scm, err := compiler.Compile("https://raw.githubusercontent.com/porter-dev/porter-charts/master/applications/web/validate.json")

	if err != nil {
		return fmt.Errorf("error compiling job chart values schema: %w", err)
	}

	jsonBytes, err := json.Marshal(values)

	if err != nil {
		return fmt.Errorf("error marshalling values to JSON: %w", err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("error unmarshalling values JSON to interface: %w", err)
	}

	return scm.Validate(v)
}

func validateWorkerChartValues(values map[string]interface{}) error {
	compiler := jsonschema.NewCompiler()

	scm, err := compiler.Compile("https://raw.githubusercontent.com/porter-dev/porter-charts/master/applications/worker/validate.json")

	if err != nil {
		return fmt.Errorf("error compiling job chart values schema: %w", err)
	}

	jsonBytes, err := json.Marshal(values)

	if err != nil {
		return fmt.Errorf("error marshalling values to JSON: %w", err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("error unmarshalling values JSON to interface: %w", err)
	}

	return scm.Validate(v)
}

func validateJobChartValues(values map[string]interface{}) error {
	compiler := jsonschema.NewCompiler()

	scm, err := compiler.Compile("https://raw.githubusercontent.com/porter-dev/porter-charts/master/applications/job/validate.json")

	if err != nil {
		return fmt.Errorf("error compiling job chart values schema: %w", err)
	}

	jsonBytes, err := json.Marshal(values)

	if err != nil {
		return fmt.Errorf("error marshalling values to JSON: %w", err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("error unmarshalling values JSON to interface: %w", err)
	}

	return scm.Validate(v)
}

func validatePostgresChartValues(values map[string]interface{}) error {
	compiler := jsonschema.NewCompiler()

	scm, err := compiler.Compile("https://raw.githubusercontent.com/porter-dev/porter-charts/master/addons/postgresql/values.schema.json")

	if err != nil {
		return fmt.Errorf("error compiling postgres chart values schema: %w", err)
	}

	jsonBytes, err := json.Marshal(values)

	if err != nil {
		return fmt.Errorf("error marshalling values to JSON: %w", err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("error unmarshalling values JSON to interface: %w", err)
	}

	return scm.Validate(v)
}
