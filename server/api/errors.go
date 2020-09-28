package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// HTTPError is the object returned when the API encounters an error: this
// gets marshaled into JSON
type HTTPError struct {
	Code   ErrorCode `json:"code"`
	Errors []string  `json:"errors"`
}

// ErrorCode is a custom Porter error code, useful for frontend messages
type ErrorCode int64

var (
	// ErrorDataWrite describes an error in writing to the database
	ErrorDataWrite = HTTPError{
		Code: 500,
		Errors: []string{
			"Could not write to database",
		},
	}

	// ErrorDataRead describes an error when reading from the database
	ErrorDataRead = HTTPError{
		Code: 500,
		Errors: []string{
			"Could not read from database",
		},
	}

	// ErrorInternal describes a generic internal server error
	ErrorInternal = HTTPError{
		Code: 500,
		Errors: []string{
			"Internal server error",
		},
	}
)

// ------------------------ Error helper functions ------------------------ //

// sendExternalError marshals an HTTPError into JSON: this function will return an error if
// a marshaling error occurs, but only after the internal error header has been sent to the
// client.
//
// It then logs it via the app.logger and sends a formatted error to the client.
func (app *App) sendExternalError(
	err error,
	code int,
	errExt HTTPError,
	w http.ResponseWriter,
) (intErr error) {
	respBytes, _ := json.Marshal(errExt)
	respBody := string(respBytes)

	app.logger.Warn().Err(err).
		Str("errExt", respBody).
		Msg("")

	w.WriteHeader(code)
	w.Write(respBytes)

	return nil
}

// handleErrorFormDecoding handles an error in decoding process from JSON to the
// construction of a Form model, and the conversion between a form model and a
// gorm.Model.
func (app *App) handleErrorFormDecoding(err error, code ErrorCode, w http.ResponseWriter) {
	errExt := HTTPError{
		Code:   code,
		Errors: []string{"Could not process JSON body"},
	}

	app.sendExternalError(err, http.StatusBadRequest, errExt, w)
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

	app.sendExternalError(err, http.StatusUnprocessableEntity, errExt, w)
}

// handleErrorRead handles an error in reading a record from the DB. If the record is
// not found, the error message is more descriptive; otherwise, a generic dataRead
// error is sent.
func (app *App) handleErrorRead(err error, code ErrorCode, w http.ResponseWriter) {
	// first check if the error is RecordNotFound -- send a more descriptive
	// message if that is the case
	if err == gorm.ErrRecordNotFound {
		errExt := HTTPError{
			Code:   code,
			Errors: []string{"Could not find requested object"},
		}

		app.sendExternalError(err, http.StatusNotFound, errExt, w)

		return
	}

	app.handleErrorDataRead(err, code, w)
}

// handleErrorDataWrite handles a database write error due to either a connection
// error with the database or failure to write that wasn't caught by the validators
func (app *App) handleErrorDataWrite(err error, code ErrorCode, w http.ResponseWriter) {
	app.sendExternalError(err, http.StatusInternalServerError, ErrorDataWrite, w)
}

// handleErrorDataRead handles a database read error due to an internal error, such as
// the database connection or gorm internals
func (app *App) handleErrorDataRead(err error, code ErrorCode, w http.ResponseWriter) {
	app.sendExternalError(err, http.StatusInternalServerError, ErrorDataRead, w)
}

// handleErrorInternalError is a catch-all for internal errors that occur during the
// processing of a request
func (app *App) handleErrorInternal(err error, w http.ResponseWriter) {
	app.sendExternalError(err, http.StatusInternalServerError, ErrorInternal, w)
}
