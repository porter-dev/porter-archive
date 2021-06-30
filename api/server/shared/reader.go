package shared

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
)

type RequestDecoderValidator interface {
	DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{}) bool
	DecodeAndValidateNoWrite(r *http.Request, v interface{}) error
}

type DefaultRequestDecoderValidator struct {
	config    *Config
	validator requestutils.Validator
	decoder   requestutils.Decoder
}

func NewDefaultRequestDecoderValidator(
	config *Config,
) RequestDecoderValidator {
	validator := requestutils.NewDefaultValidator()
	decoder := requestutils.NewDefaultDecoder()

	return &DefaultRequestDecoderValidator{config, validator, decoder}
}

func (j *DefaultRequestDecoderValidator) DecodeAndValidate(
	w http.ResponseWriter,
	r *http.Request,
	v interface{},
) (ok bool) {
	var requestErr apierrors.RequestError

	// decode the request parameters (body and query)
	if requestErr = j.decoder.Decode(v, r); requestErr != nil {
		apierrors.HandleAPIError(w, j.config.Logger, requestErr)
		return false
	}

	// validate the request object
	if requestErr = j.validator.Validate(v); requestErr != nil {
		apierrors.HandleAPIError(w, j.config.Logger, requestErr)
		return false
	}

	return true
}

func (j *DefaultRequestDecoderValidator) DecodeAndValidateNoWrite(
	r *http.Request,
	v interface{},
) error {
	var requestErr apierrors.RequestError

	// decode the request parameters (body and query)
	if requestErr = j.decoder.Decode(v, r); requestErr != nil {
		return fmt.Errorf(requestErr.InternalError())
	}

	// validate the request object
	if requestErr = j.validator.Validate(v); requestErr != nil {
		return fmt.Errorf(requestErr.InternalError())
	}

	return nil
}
