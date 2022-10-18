package preview

import (
	"fmt"

	"github.com/mitchellh/mapstructure"
	"github.com/porter-dev/switchboard/pkg/types"
)

func commonValidator(resource *types.Resource) (*Source, *Target, error) {
	source := &Source{}

	err := mapstructure.Decode(resource.Source, source)

	if err != nil {
		return nil, nil, fmt.Errorf("error parsing source for resource '%s': %w", resource.Name, err)
	}

	target := &Target{}

	err = mapstructure.Decode(resource.Target, target)

	if err != nil {
		return nil, nil, fmt.Errorf("error parsing target for resource '%s': %w", resource.Name, err)
	}

	return source, target, nil
}

func deployDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	return nil
}

func buildImageDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	return nil
}

func pushImageDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	return nil
}

func updateConfigDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	return nil
}

func randomStringDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	driverConfig := &RandomStringDriverConfig{}

	err = mapstructure.Decode(resource.Config, driverConfig)

	if err != nil {
		return fmt.Errorf("error parsing config for resource '%s': %w", resource.Name, err)
	}

	return nil
}

func envGroupDriverValidator(resource *types.Resource) error {
	_, _, err := commonValidator(resource)

	if err != nil {
		return err
	}

	return nil
}

func osEnvDriverValidator(resource *types.Resource) error {
	return nil
}
