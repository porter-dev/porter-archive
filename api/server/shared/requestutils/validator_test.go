package requestutils_test

import (
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
)

const (
	requiredErrorFmt        = "validation failed on field '%s' on condition 'required'"
	simpleConditionErrorFmt = "validation failed on field '%s' on condition '%s'"
	paramErrorFmt           = "validation failed on field '%s' on condition '%s' [ %s ]: got %s"
)

type validationErrObjectTest struct {
	valErrObj *requestutils.ValidationErrObject
	expStr    string
}

var validationErrObjectTests = []validationErrObjectTest{
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:       "username",
			Condition:   "required",
			Param:       "",
			ActualValue: nil,
		},
		expStr: fmt.Sprintf(requiredErrorFmt, "username"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:       "storage",
			Condition:   "oneof",
			Param:       "secret configmap",
			ActualValue: "notsecret",
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "'notsecret'"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:       "storage",
			Condition:   "oneof",
			Param:       "secret configmap",
			ActualValue: 1,
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "1"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:       "storage",
			Condition:   "oneof",
			Param:       "secret configmap",
			ActualValue: []string{"secret1", "secret2"},
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "[ secret1 secret2 ]"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:       "storage",
			Condition:   "oneof",
			Param:       "secret configmap",
			ActualValue: []int{1, 2},
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "[ 1 2 ]"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:     "storage",
			Condition: "oneof",
			Param:     "secret configmap",
			// for nil values, we convert the actual value to null
			ActualValue: nil,
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "null"),
	},
	{
		valErrObj: &requestutils.ValidationErrObject{
			Field:     "storage",
			Condition: "oneof",
			Param:     "secret configmap",
			// for unrecognized types, we don't cast to value
			ActualValue: map[string]string{
				"not": "cast",
			},
		},
		expStr: fmt.Sprintf(paramErrorFmt, "storage", "oneof", "secret configmap", "invalid type"),
	},
}

func TestValidationErrObject(t *testing.T) {
	assert := assert.New(t)

	for _, test := range validationErrObjectTests {
		// test that the function outputs the expected readable error message
		readableStr := test.valErrObj.SafeExternalError()
		expReadableStr := test.expStr

		assert.Equal(
			expReadableStr,
			readableStr,
			"readable string not equal: expected %s, got %s",
			expReadableStr,
			readableStr,
		)
	}
}

type validationTest struct {
	description   string
	valObj        interface{}
	expErr        bool
	expErrStrings []string
}

type validationTestObj struct {
	ID      uint   `form:"required"`
	Name    string `form:"required"`
	Email   string `form:"email"`
	Storage string `form:"oneof=sqlite postgres"`
}

var validationTests = []validationTest{
	{
		description: "Missing all fields",
		valObj:      &validationTestObj{},
		expErr:      true,
		expErrStrings: []string{
			fmt.Sprintf(requiredErrorFmt, "ID"),
			fmt.Sprintf(requiredErrorFmt, "Name"),
			fmt.Sprintf(simpleConditionErrorFmt, "Email", "email"),
			fmt.Sprintf(paramErrorFmt, "Storage", "oneof", "sqlite postgres", "''"),
		},
	},
	{
		description: "Fails email validation",
		valObj: &validationTestObj{
			ID:      1,
			Name:    "whatever",
			Email:   "notanemail",
			Storage: "postgres",
		},
		expErr: true,
		expErrStrings: []string{
			fmt.Sprintf(simpleConditionErrorFmt, "Email", "email"),
		},
	},
	{
		description: "Should pass all",
		valObj: &validationTestObj{
			ID:      1,
			Name:    "whatever",
			Email:   "anemail@gmail.com",
			Storage: "postgres",
		},
		expErr:        false,
		expErrStrings: []string{},
	},
}

func TestValidation(t *testing.T) {
	assert := assert.New(t)
	validator := requestutils.NewDefaultValidator()

	for _, test := range validationTests {
		// test that the function outputs the expected readable error message
		err := validator.Validate(test.valObj)

		assert.Equal(
			err != nil,
			test.expErr,
			"[ %s ]: expected error was %t, got %t",
			test.description,
			err != nil,
			test.expErr,
		)

		if err != nil && test.expErr {
			readableStrArr := strings.Split(err.Error(), ",")
			expReadableStrArr := test.expErrStrings

			assert.ElementsMatch(
				expReadableStrArr,
				readableStrArr,
				"[ %s ]: readable string not equal",
				test.description,
			)

			// check that external and internal errors are returned as well
			assert.Equal(
				400,
				err.GetStatusCode(),
				"[ %s ]: status code not equal",
				test.description,
			)
		}
	}
}

func TestValidationNilParam(t *testing.T) {
	validator := requestutils.NewDefaultValidator()

	err := validator.Validate(nil)
	expErr := apierrors.NewErrInternal(fmt.Errorf("could not cast err to validator.ValidationErrors"))

	// check that error type is of type apierrors.RequestError and that
	// message is correct
	assert.EqualError(t, err, expErr.Error(), "nil param error not internal server error")

	var expErrTarget apierrors.RequestError
	assert.ErrorAs(t, err, &expErrTarget)
}

func TestErrFailedRequestValidation(t *testing.T) {
	assert := assert.New(t)

	// just check that status code is 400 and all errors are set
	expErrStr := "readable error"
	err := requestutils.NewErrFailedRequestValidation(expErrStr)

	assert.Equal(
		expErrStr,
		err.Error(),
		"incorrect value for Error() method",
	)

	assert.Equal(
		expErrStr,
		err.ExternalError(),
		"incorrect value for ExternalError() method",
	)

	// check that the status code is 400
	assert.Equal(
		expErrStr,
		err.InternalError(),
		"incorrect value for InternalError() method",
	)
}
