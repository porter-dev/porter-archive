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

type porterYAMLValidator struct {
	driverValidators map[string]driverBasedResourceValidator
}

func NewPorterYAMLValidator() *porterYAMLValidator {
	driverValidators := make(map[string]driverBasedResourceValidator)

	driverValidators["push-image"] = pushImageDriverValidator

	return &porterYAMLValidator{
		driverValidators: driverValidators,
	}
}

func (v *porterYAMLValidator) Validate(contents string) []error {
	var errors []error

	resGroup, err := parser.ParseRawBytes([]byte(contents))

	if err != nil {
		errors = append(errors, fmt.Errorf("error parsing porter.yaml: %w", err))
		return errors
	}

	for _, res := range resGroup.Resources {
		if validator, ok := v.driverValidators[res.Driver]; ok {
			if err := validator(res); err != nil {
				errors = append(errors, err)
			}
		} else {
			errors = append(errors, fmt.Errorf("%w: %s", ErrUnsupportedDriver, res.Driver))
		}
	}

	return errors
}
