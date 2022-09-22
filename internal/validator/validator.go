package validator

import (
	"github.com/go-playground/validator/v10"
	"k8s.io/apimachinery/pkg/util/validation"
)

// New creates a new instance of validator and sets the tag name
// to "form", instead of "validate"
func New() *validator.Validate {
	validate := validator.New()
	validate.SetTagName("form")
	validate.RegisterValidation("dns1123", func(fl validator.FieldLevel) bool {
		return len(validation.IsDNS1123Label(fl.Field().String())) == 0
	})
	return validate
}
