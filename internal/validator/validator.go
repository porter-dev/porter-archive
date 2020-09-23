package validator

import (
	"gopkg.in/go-playground/validator.v9"
)

func New() *validator.Validate {
	validate := validator.New()
	validate.SetTagName("form")
	return validate
}
