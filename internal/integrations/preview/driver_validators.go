package preview

import (
	"encoding/json"
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/switchboard/pkg/types"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

func commonValidator(resource *types.Resource) (*Source, *Target, error) {
	source := &Source{}

	err := mapstructure.Decode(resource.Source, source)

	if err != nil {
		return nil, nil, fmt.Errorf("for resource '%s': error parsing source: %w", resource.Name, err)
	}

	target := &Target{}

	err = mapstructure.Decode(resource.Target, target)

	if err != nil {
		return nil, nil, fmt.Errorf("for resource '%s': error parsing target: %w", resource.Name, err)
	}

	return source, target, nil
}

func deployDriverValidator(resource *types.Resource) error {
	deployDriverSchema, err := schemas.ReadFile("embed/deploy_driver.schema.json")

	if err != nil {
		return fmt.Errorf("for resource '%s': error reading deploy driver schema: %w", resource.Name, err)
	}

	deployDriverSchemaCompiler, err := jsonschema.CompileString("deploy_driver.schema.json", string(deployDriverSchema))

	if err != nil {
		return fmt.Errorf("for resource '%s': error compiling deploy driver schema: %w", resource.Name, err)
	}

	jsonBytes, err := json.Marshal(resource)

	if err != nil {
		return fmt.Errorf("for resource '%s': error marshalling to JSON: %w", resource.Name, err)
	}

	var v interface{}

	if err := json.Unmarshal(jsonBytes, &v); err != nil {
		return fmt.Errorf("for resource '%s': error unmarshalling to interface: %w", resource.Name, err)
	}

	return deployDriverSchemaCompiler.Validate(v)
}

func buildImageDriverValidator(resource *types.Resource) error {
	_, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	}

	driverConfig := &BuildDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func pushImageDriverValidator(resource *types.Resource) error {
	_, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	}

	driverConfig := &PushDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func updateConfigDriverValidator(resource *types.Resource) error {
	_, target, err := commonValidator(resource)

	if err != nil {
		return err
	}

	if target.AppName == "" {
		return fmt.Errorf("for resource '%s': target app_name is missing", resource.Name)
	}

	driverConfig := &UpdateConfigDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func randomStringDriverValidator(resource *types.Resource) error {
	driverConfig := &RandomStringDriverConfig{}

	err := mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func envGroupDriverValidator(resource *types.Resource) error {
	target := &Target{}

	err := mapstructure.Decode(resource.Target, target)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing target: %w", resource.Name, err)
	}

	config := &EnvGroupDriverConfig{}

	err = mapstructure.Decode(resource.Config, config)

	if err != nil {
		return fmt.Errorf("for resource '%s': error parsing config: %w", resource.Name, err)
	}

	return nil
}

func osEnvDriverValidator(resource *types.Resource) error {
	return nil
}
