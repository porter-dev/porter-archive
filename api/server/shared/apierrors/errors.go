package apierrors

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/rs/zerolog"
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
}

func NewErrPassThroughToClient(err error, statusCode int) RequestError {
	return &ErrPassThroughToClient{err, statusCode}
}

func (e *ErrPassThroughToClient) Error() string {
	return e.err.Error()
}

func (e *ErrPassThroughToClient) InternalError() string {
	return e.err.Error()
}

func (e *ErrPassThroughToClient) ExternalError() string {
	return e.err.Error()
}

func (e *ErrPassThroughToClient) GetStatusCode() int {
	return e.statusCode
}

func HandleAPIError(
	config *config.Config,
	w http.ResponseWriter,
	r *http.Request,
	err RequestError,
) {
	extErrorStr := err.ExternalError()

	// log the internal error
	event := config.Logger.Warn().
		Str("internal_error", err.InternalError()).
		Str("external_error", extErrorStr)

	data := addLoggingScopes(r.Context(), event)
	addLoggingRequestMeta(r, event)

	event.Send()

	// if the status code is internal server error, use alerter
	if err.GetStatusCode() == http.StatusInternalServerError && config.Alerter != nil {
		data["method"] = r.Method
		data["url"] = r.URL.String()

		config.Alerter.SendAlert(r.Context(), err, data)
	}

	// send the external error
	resp := &types.ExternalError{
		Error: extErrorStr,
	}

	// write the status code
	w.WriteHeader(err.GetStatusCode())

	writerErr := json.NewEncoder(w).Encode(resp)

	if writerErr != nil {
		event := config.Logger.Error().
			Err(writerErr)

		addLoggingScopes(r.Context(), event)
		addLoggingRequestMeta(r, event)

		event.Send()
	}

	return
}

func addLoggingScopes(ctx context.Context, event *zerolog.Event) map[string]interface{} {
	res := make(map[string]interface{})

	// case on the context values that exist, add them to event
	if userVal := ctx.Value(types.UserScope); userVal != nil {
		if userModel, ok := userVal.(*models.User); ok {
			event.Uint("user_id", userModel.ID)
			res["user_id"] = userModel.ID
		}
	}

	// if this is a project-scoped route, add various scopes
	if reqScopesVal := ctx.Value(types.RequestScopeCtxKey); reqScopesVal != nil {
		if reqScopes, ok := reqScopesVal.(map[types.PermissionScope]*types.RequestAction); ok {
			for key, scope := range reqScopes {
				if scope.Resource.Name != "" {
					event.Str(string(key), scope.Resource.Name)
					res[string(key)] = scope.Resource.Name
				}

				if scope.Resource.UInt != 0 {
					event.Uint(string(key), scope.Resource.UInt)
					res[string(key)] = scope.Resource.UInt
				}
			}
		}
	}

	return res
}

func addLoggingRequestMeta(r *http.Request, event *zerolog.Event) {
	event.Str("method", r.Method)
	event.Str("url", r.URL.String())
}
