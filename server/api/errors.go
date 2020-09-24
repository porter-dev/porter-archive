package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-playground/validator/v10"
)

const (
	appErrDataWrite    = "data write error"
	appErrFormDecoding = "could not process JSON body"
)

// HTTPError is the object returned when the API encounters an error: this
// gets marshaled into JSON
type HTTPError struct {
	Code   ErrorCode `json:"code"`
	Errors []string  `json:"errors"`
}

// ErrorCode is a custom Porter error code, useful for frontend messages
type ErrorCode int64

// Enumeration of API error codes, represented as int64
const (
	ErrUserDecode ErrorCode = iota
	ErrUserValidateFields
	ErrUserDataWrite
)

// ------------------------ Error helper functions ------------------------ //

// sendExternalError marshals an HTTPError into JSON: this function will return an error if
// a marshaling error occurs, but only after the internal error header has been sent to the
// client.
//
// It then logs it via the app.logger and sends a formatted error to the client.
func (app *App) sendExternalError(err error, errExt HTTPError, w http.ResponseWriter) (intErr error) {
	respBytes, newErr := json.Marshal(errExt)

	if newErr != nil {
		app.handleErrorInternalError(newErr, w)
		return newErr
	}

	respBody := string(respBytes)

	app.logger.Warn().Err(err).
		Str("errExt", respBody).
		Msg("")

	fmt.Fprintf(w, respBody)

	return nil
}

// handleErrorFormDecoding handles an error in decoding process from JSON to the
// construction of a Form model, and the conversion between a form model and a
// gorm.Model.
func (app *App) handleErrorFormDecoding(err error, code ErrorCode, w http.ResponseWriter) {
	errExt := HTTPError{
		Code:   code,
		Errors: []string{appErrFormDecoding},
	}

	intErr := app.sendExternalError(err, errExt, w)

	if intErr == nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
	}
}

// handleErrorFormValidation handles an error in the validation of form fields, and
// sends a descriptive method about the incorrect fields to the client.
func (app *App) handleErrorFormValidation(err error, code ErrorCode, w http.ResponseWriter) {
	// translate all validator errors
	errs := err.(validator.ValidationErrors)
	res := make([]string, 0)

	for _, field := range errs {
		valErr := field.Tag() + " validation failed"

		res = append(res, valErr)
	}

	errExt := HTTPError{
		Code:   code,
		Errors: res,
	}

	intErr := app.sendExternalError(err, errExt, w)

	if intErr == nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
	}
}

// handleErrorDataWrite handles a database write error
func (app *App) handleErrorDataWrite(err error, code ErrorCode, w http.ResponseWriter) {
	errExt := HTTPError{
		Code:   code,
		Errors: []string{appErrDataWrite},
	}

	intErr := app.sendExternalError(err, errExt, w)

	if intErr == nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
	}
}

// handleErrorInternalError is a catch-all for internal errors that occur during the
// processing of a request
func (app *App) handleErrorInternalError(err error, w http.ResponseWriter) {
	app.logger.Warn().Err(err).Msg("")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, `{"error": "Internal server error"}`)
}
