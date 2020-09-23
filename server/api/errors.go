package api

import (
	"fmt"
	"net/http"
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

func (app *App) handleDataWriteFailure(err error, w http.ResponseWriter) {
	app.logger.Warn().Err(err).Msg("")
	w.WriteHeader(http.StatusInternalServerError)
	fmt.Fprintf(w, `{"error": "%v"}`, appErrDataCreationFailure)
}
