package validator

import (
	"github.com/go-playground/validator/v10"
)

// New creates a new instance of validator and sets the tag name
// to "form", instead of "validate"
func New() *validator.Validate {
	validate := validator.New()
	validate.SetTagName("form")
	return validate
}
