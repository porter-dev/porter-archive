package requestutils

import (
	"fmt"
	"net/http"
	"strings"

	v10Validator "github.com/go-playground/validator/v10"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/validator"
)

// Validator will validate the fields for a request object to ensure that
// the request is well-formed. For example, it searches for required fields
// or verifies that fields are of a semantic type (like email)
type Validator interface {
	// Validate accepts a generic struct for validating. It returns a request
	// error that is meant to be shown to the end user as a readable string.
	Validate(s interface{}) apierrors.RequestError
}

// DefaultValidator uses the go-playground v10 validator for verifying that
// request objects are well-formed
type DefaultValidator struct {
	v10 *v10Validator.Validate
}

// NewDefaultValidator returns a Validator constructed from the go-playground v10
// validator
func NewDefaultValidator() Validator {
	return &DefaultValidator{validator.New()}
}

// Validate uses the go-playground v10 validator and checks struct fields against
// a `form:"<validator>"` tag.
func (v *DefaultValidator) Validate(s interface{}) apierrors.RequestError {
	err := v.v10.Struct(s)

	if err == nil {
		return nil
	}

	// translate all validator errors
	errs, ok := err.(v10Validator.ValidationErrors)

	if !ok {
		return apierrors.NewErrInternal(fmt.Errorf("could not cast err to validator.ValidationErrors"))
	}

	// convert all validator errors to error strings
	errorStrs := make([]string, len(errs))

	for i, field := range errs {
		errObj := NewValidationErrObject(field)

		errorStrs[i] = errObj.SafeExternalError()
	}

	return NewErrFailedRequestValidation(strings.Join(errorStrs, ","))
}

func NewErrFailedRequestValidation(valError string) apierrors.RequestError {
	// return 400 error since a validation error indicates an issue with the user request
	return apierrors.NewErrPassThroughToClient(fmt.Errorf(valError), http.StatusBadRequest)
}

// ValidationErrObject represents an error referencing a specific field in a struct that
// must match a specific condition. This object is modeled off of the go-playground v10
// validator `FieldError` type, but can be used generically for any request validation
// issues that occur downstream.
type ValidationErrObject struct {
	// Field is the request field that has a validation error.
	Field string

	// Condition is the condition that was not satisfied, resulting in the validation
	// error
	Condition string

	// Param is an optional field that shows a parameter that was not satisfied. For example,
	// the field value was not found in the set [ "value1", "value2" ], so "value1", "value2"
	// is the parameter in this case.
	Param string

	// ActualValue is the actual value of the field that failed validation.
	ActualValue interface{}
}

// NewValidationErrObject simply returns a ValidationErrObject from a go-playground v10
// validator `FieldError`
func NewValidationErrObject(fieldErr v10Validator.FieldError) *ValidationErrObject {
	return &ValidationErrObject{
		Field:       fieldErr.Field(),
		Condition:   fieldErr.ActualTag(),
		Param:       fieldErr.Param(),
		ActualValue: fieldErr.Value(),
	}
}

// SafeExternalError converts the ValidationErrObject to a string that is readable and safe
// to send externally. In this case, "safe" means that when the `ActualValue` field is cast
// to a string, it is type-checked so that only certain types are passed to the user. We
// don't want an upstream command accidentally setting a complex object in the request field
// that could leak sensitive information to the user. To limit this, we only support sending
// static `ActualValue` types: `string`, `int`, `[]string`, and `[]int`. Otherwise, we say that
// the actual value is "invalid type".
//
// Note: the test cases split on "," to parse out the different errors. Don't add commas to the
// safe external error.
func (obj *ValidationErrObject) SafeExternalError() string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("validation failed on field '%s' on condition '%s'", obj.Field, obj.Condition))

	if obj.Param != "" {
		sb.WriteString(fmt.Sprintf(" [ %s ]: got %s", obj.Param, obj.getActualValueString()))
	}

	return sb.String()
}

func (obj *ValidationErrObject) getActualValueString() string {
	// we translate to "json-readable" form for nil values, since clients may not be Golang
	if obj.ActualValue == nil {
		return "null"
	}

	// create type switch statement to make sure that we don't accidentally leak
	// data. we only want to write strings, numbers, or slices of strings/numbers.
	// different data types can be added if necessary, as long as they are checked
	switch v := obj.ActualValue.(type) {
	case int:
		return fmt.Sprintf("%d", v)
	case string:
		return fmt.Sprintf("'%s'", v)
	case []string:
		return fmt.Sprintf("[ %s ]", strings.Join(v, " "))
	case []int:
		strArr := make([]string, len(v))

		for i, intItem := range v {
			strArr[i] = fmt.Sprintf("%d", intItem)
		}

		return fmt.Sprintf("[ %s ]", strings.Join(strArr, " "))
	default:
		return "invalid type"
	}
}
