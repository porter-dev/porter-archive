package api

import (
	"encoding/json"
	"fmt"
	"github.com/go-chi/chi"
	"net/http"
)

type HandleUpdateNotificationConfigForm struct {
	Payload struct {
		Enabled bool `json:"enabled"`
		Deploy  bool `json:"deploy"`
		Success bool `json:"success"`
		Failure bool `json:"failure"`
	} `json:"payload"`
	Namespace string `json:"namespace"`
	ClusterID uint   `json:"cluster_id"`
}

// HandleUpdateNotificationConfig updates notification settings for a given release
func (app *App) HandleUpdateNotificationConfig(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	form := &HandleUpdateNotificationConfigForm{}

	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	release, err := app.Repo.Release.ReadRelease(form.ClusterID, name, form.Namespace)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"release not found"},
		}, w)
	}

	fmt.Println(release)
}
