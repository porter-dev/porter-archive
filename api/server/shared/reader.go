package shared

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/internal/alerter"
	"github.com/porter-dev/porter/pkg/logger"
)

type RequestDecoderValidator interface {
	DecodeAndValidate(w http.ResponseWriter, r *http.Request, v interface{}) bool
	DecodeAndValidateNoWrite(r *http.Request, v interface{}) error
}

type DefaultRequestDecoderValidator struct {
	logger    *logger.Logger
	alerter   alerter.Alerter
	validator requestutils.Validator
	decoder   requestutils.Decoder
}

func NewDefaultRequestDecoderValidator(
	logger *logger.Logger,
	alerter alerter.Alerter,
) RequestDecoderValidator {
	validator := requestutils.NewDefaultValidator()
	decoder := requestutils.NewDefaultDecoder()

	return &DefaultRequestDecoderValidator{logger, alerter, validator, decoder}
}

func (j *DefaultRequestDecoderValidator) DecodeAndValidate(
	w http.ResponseWriter,
	r *http.Request,
	v interface{},
) (ok bool) {
	var requestErr apierrors.RequestError

	// decode the request parameters (body and query)
	if requestErr = j.decoder.Decode(v, r); requestErr != nil {
		apierrors.HandleAPIError(j.logger, j.alerter, w, r, requestErr, true)
		return false
	}

	// validate the request object
	if requestErr = j.validator.Validate(v); requestErr != nil {
		apierrors.HandleAPIError(j.logger, j.alerter, w, r, requestErr, true)
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
