package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"gopkg.in/go-playground/validator.v9"
)

const (
	appErrDataCreationFailure = "data creation failure"
	appErrFormDecodingFailure = "form decoding failure"
)

func (app *App) handleUnprocessableEntity(err error, w http.ResponseWriter) {
	app.logger.Warn().Err(err).Msg("")
	w.WriteHeader(http.StatusUnprocessableEntity)
	fmt.Fprintf(w, `{"error": "%v"}`, appErrFormDecodingFailure)
}

func (app *App) handleErrorFormValidation(err error, w http.ResponseWriter) {
	// translate all validator errors
	errs := err.(validator.ValidationErrors)
	translation := errs.Translate(*app.translator)
	respBody, newErr := json.Marshal(translation)

	if newErr != nil {
		app.handleGenericInternalError(newErr, w)
	}

	fmt.Fprintf(w, `{"errors": %v}`, respBody)
}

func (app *App) handleDataWriteFailure(err error, w http.ResponseWriter) {
	app.logger.Warn().Err(err).Msg("")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, `{"error": "%v"}`, appErrDataCreationFailure)
}

func (app *App) handleGenericInternalError(err error, w http.ResponseWriter) {
	app.logger.Warn().Err(err).Msg("")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, `{"error": "Internal server error"}`)
}
