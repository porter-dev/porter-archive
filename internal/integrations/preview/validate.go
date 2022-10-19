package preview

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/porter-dev/switchboard/pkg/parser"
	"github.com/porter-dev/switchboard/pkg/types"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
	"sigs.k8s.io/yaml"
)

//go:embed embed/*.schema.json
var schemas embed.FS

var (
	ErrNoPorterYAMLFile    = errors.New("porter.yaml does not exist in the root of this repository")
	ErrEmptyPorterYAMLFile = errors.New("porter.yaml is empty")

	ErrUnsupportedDriver = errors.New("no such driver")
)

type driverBasedResourceValidator func(*types.Resource) error

var driverValidators = make(map[string]driverBasedResourceValidator)

func init() {
	driverValidators[""] = deployDriverValidator
	driverValidators["deploy"] = deployDriverValidator
	driverValidators["build-image"] = buildImageDriverValidator
	driverValidators["push-image"] = pushImageDriverValidator
	driverValidators["update-config"] = updateConfigDriverValidator
	driverValidators["random-string"] = randomStringDriverValidator
	driverValidators["env-group"] = envGroupDriverValidator
	driverValidators["os-env"] = osEnvDriverValidator
}

func Validate(contents string) []error {
	var errors []error

	resGroup, err := parser.ParseRawBytes([]byte(contents))

	if err != nil {
		errors = append(errors, fmt.Errorf("error parsing porter.yaml: %w", err))
		return errors
	}

	depResolver := newDependencyResolver(resGroup.Resources)

	err = depResolver.Resolve()

	if err != nil {
		errors = append(errors, fmt.Errorf("error resolving dependencies: %w", err))
		return errors
	}

	err = semanticCheck(contents)

	if err != nil {
		errors = append(errors, fmt.Errorf("error validating porter.yaml: %w", err))
		return errors
	}

	for _, res := range resGroup.Resources {
		if validator, ok := driverValidators[res.Driver]; ok {
			if err := validator(res); err != nil {
				errors = append(errors, err)
			}
		} else {
			errors = append(errors, fmt.Errorf("for resource '%s': %w: %s", res.Name, ErrUnsupportedDriver, res.Driver))
		}
	}

	return errors
}

func semanticCheck(contents string) error {
	porterYAMLSchema, err := schemas.ReadFile("embed/porteryaml.schema.json")

	if err != nil {
		return fmt.Errorf("error reading porterYAML schema: %w", err)
	}

	porterYAMLSchemaCompiler, err := jsonschema.CompileString("porteryaml.schema.json", string(porterYAMLSchema))

	if err != nil {
		return fmt.Errorf("error compiling porterYAML schema: %w", err)
	}

	jsonBytes, err := yaml.YAMLToJSON([]byte(contents))

	if err != nil {
		return fmt.Errorf("error converting porter.yaml to JSON: %w", err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("error unmarshalling porter.yaml to interface: %w", err)
	}

	return porterYAMLSchemaCompiler.Validate(v)
}
