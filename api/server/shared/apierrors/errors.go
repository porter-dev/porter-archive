package apierrors

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/shared/apierrors/alerter"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/pkg/logger"
)

type RequestError interface {
	Error() string
	ExternalError() string
	InternalError() string
	GetStatusCode() int
}

type ErrInternal struct {
	err error
}

func NewErrInternal(err error) RequestError {
	return &ErrInternal{err}
}

func (e *ErrInternal) Error() string {
	return e.err.Error()
}

func (e *ErrInternal) InternalError() string {
	return e.err.Error()
}

func (e *ErrInternal) ExternalError() string {
	return "An internal error occurred."
}

func (e *ErrInternal) GetStatusCode() int {
	return http.StatusInternalServerError
}

type ErrForbidden struct {
	err error
}

func NewErrForbidden(err error) RequestError {
	return &ErrForbidden{err}
}

func (e *ErrForbidden) Error() string {
	return e.err.Error()
}

func (e *ErrForbidden) InternalError() string {
	return e.err.Error()
}

func (e *ErrForbidden) ExternalError() string {
	return "Forbidden"
}

func (e *ErrForbidden) GetStatusCode() int {
	return http.StatusForbidden
}

// errors that should be passed directly, with no filter
type ErrPassThroughToClient struct {
	err        error
	statusCode int
	errDetails []string
}

func NewErrPassThroughToClient(err error, statusCode int, details ...string) RequestError {
	return &ErrPassThroughToClient{err, statusCode, details}
}

func (e *ErrPassThroughToClient) Error() string {
	return e.err.Error()
}

func (e *ErrPassThroughToClient) InternalError() string {
	return e.err.Error() + strings.Join(e.errDetails, ",")
}

func (e *ErrPassThroughToClient) ExternalError() string {
	return e.err.Error()
}

func (e *ErrPassThroughToClient) GetStatusCode() int {
	return e.statusCode
}

// errors that denote that a resource was not found
type ErrNotFound struct {
	err error
}

func NewErrNotFound(err error) RequestError {
	return &ErrNotFound{err}
}

func (e *ErrNotFound) Error() string {
	return e.err.Error()
}

func (e *ErrNotFound) InternalError() string {
	return e.err.Error()
}

func (e *ErrNotFound) ExternalError() string {
	return "Resource not found."
}

func (e *ErrNotFound) GetStatusCode() int {
	return http.StatusNotFound
}

type ErrorOpts struct {
	Code uint
}

func HandleAPIError(
	l *logger.Logger,
	alerter alerter.Alerter,
	w http.ResponseWriter,
	r *http.Request,
	err RequestError,
	writeErr bool,
	opts ...ErrorOpts,
) {
	extErrorStr := err.ExternalError()

	// log the internal error
	event := l.Warn().
		Str("internal_error", err.InternalError()).
		Str("external_error", extErrorStr)

	data := logger.AddLoggingContextScopes(r.Context(), event)
	logger.AddLoggingRequestMeta(r, event)

	event.Send()

	// if the status code is internal server error, use alerter
	if err.GetStatusCode() == http.StatusInternalServerError && alerter != nil {
		data["method"] = r.Method
		data["url"] = r.URL.String()

		alerter.SendAlert(r.Context(), err, data)
	}

	if writeErr {
		// send the external error
		resp := &types.ExternalError{
			Error: extErrorStr,
		}

		if len(opts) > 0 {
			resp.Code = opts[0].Code
		}

		// write the status code
		w.WriteHeader(err.GetStatusCode())

		writerErr := json.NewEncoder(w).Encode(resp)

		if writerErr != nil {
			event := l.Error().
				Err(writerErr)

			logger.AddLoggingContextScopes(r.Context(), event)
			logger.AddLoggingRequestMeta(r, event)

			event.Send()
		}
	}

	return
}
