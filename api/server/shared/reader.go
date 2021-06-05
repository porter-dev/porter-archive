package shared

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/requestutils"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
)

type RequestDecoderValidator interface {
	DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{}) bool
}

type DefaultRequestDecoderValidator struct {
	config    *Config
	validator requestutils.Validator
	decoder   requestutils.Decoder
}

func NewDefaultRequestDecoderValidator(
	config *Config,
	validator requestutils.Validator,
	decoder requestutils.Decoder,
) RequestDecoderValidator {
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
