package preview

import (
	"github.com/porter-dev/switchboard/pkg/models"
	"github.com/porter-dev/switchboard/pkg/parser"
)

type driverBasedResourceValidator func(*models.Resource)

type porterYAMLValidator struct {
	driverValidators map[string]driverBasedResourceValidator
}

func NewPorterYAMLValidator() *porterYAMLValidator {
	return &porterYAMLValidator{
		driverValidators: make(map[string]driverBasedResourceValidator),
	}
}

func (v *porterYAMLValidator) Validate(contents string) error {
	resGroup, err := parser.ParseRawBytes([]byte(contents))

	if err != nil {
		return err
	}

	for range resGroup.Resources {

	}

	return nil
}
