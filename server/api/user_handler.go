package api

import "net/http"

// HandleCreateUser is majestic
func (app *App) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
}

// HandleReadUser is majestic
func (app *App) HandleReadUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("{}"))
}

// HandleUpdateUser is majestic
func (app *App) HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}

// HandleDeleteUser is majestic
func (app *App) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusAccepted)
}
