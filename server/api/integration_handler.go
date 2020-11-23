package api

import (
	"encoding/json"
	"net/http"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// HandleListClusterIntegrations lists the cluster integrations available to the
// instance
func (app *App) HandleListClusterIntegrations(w http.ResponseWriter, r *http.Request) {
	clusters := ints.PorterClusterIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&clusters); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRegistryIntegrations lists the image registry integrations available to the
// instance
func (app *App) HandleListRegistryIntegrations(w http.ResponseWriter, r *http.Request) {
	registries := ints.PorterRegistryIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&registries); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListRepoIntegrations lists the repo integrations available to the
// instance
func (app *App) HandleListRepoIntegrations(w http.ResponseWriter, r *http.Request) {
	repos := ints.PorterRepoIntegrations

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&repos); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
