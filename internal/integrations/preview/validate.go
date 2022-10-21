package preview

import (
	"errors"
	"fmt"

	"github.com/porter-dev/switchboard/pkg/parser"
	"github.com/porter-dev/switchboard/pkg/types"
	"k8s.io/apimachinery/pkg/util/validation"
)

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

	for _, res := range resGroup.Resources {
		if len(res.Name) == 0 {
			errors = append(errors, fmt.Errorf("resource has no name"))
		} else if errStrs := validation.IsDNS1123Label(res.Name); len(errStrs) > 0 {
			str := fmt.Sprintf("for resource '%s': invalid characters found in name:", res.Name)
			for _, errStr := range errStrs {
				str += fmt.Sprintf("\n  * %s", errStr)
			}

			errors = append(errors, fmt.Errorf("%s", str))
		}

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
