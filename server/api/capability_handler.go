package api

import (
	"encoding/json"
	"net/http"
)

// CapabilitiesExternal represents the Capabilities struct that will be sent over REST
type CapabilitiesExternal struct {
	Provisioner bool `json:"provisioner"`
	GitHub bool	`json:"github"`
}

// HandleGetCapabilities gets the capabilities of the server
func (app *App) HandleGetCapabilities(w http.ResponseWriter, r *http.Request) {

	cap := app.CapConf

	capExternal := &CapabilitiesExternal{
		Provisioner: cap.Provisioner,
		GitHub: cap.Github,
	}

	if err := json.NewEncoder(w).Encode(capExternal); err != nil {
		app.handleErrorFormDecoding(err, ErrK8sDecode, w)
		return
	}
}
