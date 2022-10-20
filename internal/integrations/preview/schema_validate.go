package preview

import (
	"encoding/json"
	"fmt"

	"github.com/santhosh-tekuri/jsonschema/v5"
	_ "github.com/santhosh-tekuri/jsonschema/v5/httploader"
)

func validateWebChartValues(values map[string]interface{}) error {
	webValuesSchema, err := schemas.ReadFile("embed/web.values.schema.json")

	if err != nil {
		return fmt.Errorf("error reading web chart values schema: %w", err)
	}

	scm, err := jsonschema.CompileString("web.values.schema.json", string(webValuesSchema))

	if err != nil {
		return fmt.Errorf("error compiling web chart values schema: %w", err)
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
	workerValuesSchema, err := schemas.ReadFile("embed/worker.values.schema.json")

	if err != nil {
		return fmt.Errorf("error reading worker chart values schema: %w", err)
	}

	scm, err := jsonschema.CompileString("worker.values.schema.json", string(workerValuesSchema))

	if err != nil {
		return fmt.Errorf("error compiling worker chart values schema: %w", err)
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
	jobValuesSchema, err := schemas.ReadFile("embed/job.values.schema.json")

	if err != nil {
		return fmt.Errorf("error reading job chart values schema: %w", err)
	}

	scm, err := jsonschema.CompileString("job.values.schema.json", string(jobValuesSchema))

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
