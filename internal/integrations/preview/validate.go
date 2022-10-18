package preview

import (
	"errors"
	"fmt"

	"github.com/porter-dev/switchboard/pkg/parser"
	"github.com/porter-dev/switchboard/pkg/types"
)

var (
	ErrNoPorterYAMLFile    = errors.New("porter.yaml does not exist in the root of this repository")
	ErrEmptyPorterYAMLFile = errors.New("porter.yaml is empty")

	ErrUnsupportedDriver = errors.New("no such driver")
)

type driverBasedResourceValidator func(*types.Resource) error

var driverValidators = make(map[string]driverBasedResourceValidator)

func init() {
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
