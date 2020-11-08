package api

import (
	"net/http"
)

// HandleLive responds immediately with an HTTP 200 status.
func (app *App) HandleLive(w http.ResponseWriter, r *http.Request) {
	writeHealthy(w)
}

// HandleReady responds with HTTP 200 if healthy, 500 otherwise
func (app *App) HandleReady(w http.ResponseWriter, r *http.Request) {
	if app.db == nil {
		writeHealthy(w)
		return
	}

	db, err := app.db.DB()

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	if err := db.Ping(); err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	writeHealthy(w)
}

func writeHealthy(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("."))
}

func writeUnhealthy(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusInternalServerError)
	w.Write([]byte("."))
}
