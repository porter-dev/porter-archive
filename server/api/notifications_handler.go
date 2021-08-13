package api

import (
	"encoding/json"
	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/models"
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

	// either create a new notification config or update the current one
	newConfig := &models.NotificationConfig{
		Enabled: form.Payload.Enabled,
		Deploy:  form.Payload.Deploy,
		Success: form.Payload.Success,
		Failure: form.Payload.Failure,
	}

	if release.NotificationConfig == 0 {
		newConfig, err = app.Repo.NotificationConfig.CreateNotificationConfig(newConfig)

		if err != nil {
			app.handleErrorInternal(err, w)
			return
		}

		release.NotificationConfig = newConfig.ID

		release, err = app.Repo.Release.UpdateRelease(release)

	} else {
		newConfig.ID = release.NotificationConfig
		newConfig, err = app.Repo.NotificationConfig.UpdateNotificationConfig(newConfig)
	}

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}
