package api

import (
	"encoding/json"
	"net/http"
)

// HandleGetCapabilities gets the capabilities of the server
func (app *App) HandleGetCapabilities(w http.ResponseWriter, r *http.Request) {
	if err := json.NewEncoder(w).Encode(app.Capabilities); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return

	}
}
