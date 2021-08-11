package api

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/gorilla/schema"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// HandleCreateEvent creates a new event in a project
func (app *App) HandleCreateEvent(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"cluster not found"},
		}, w)
	}

	form := &forms.CreateEventForm{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
		return
	}

	// convert the form to an invite
	event := form.ToEvent(uint(projID), uint(clusterID))

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	event, err = app.Repo.Event.CreateEvent(event)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// HandleListEvents lists the events that match certain conditions in a project
func (app *App) HandleListEvents(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"cluster not found"},
		}, w)
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	opts := &repository.ListEventOpts{
		ClusterID: uint(clusterID),
	}

	decoder := schema.NewDecoder()

	decoder.IgnoreUnknownKeys(true)

	if err := decoder.Decode(opts, vals); err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"bad request"},
		}, w)
	}

	// handle write to the database
	events, err := app.Repo.Event.ListEventsByProjectID(uint(projID), opts)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	eventExts := make([]*models.EventExternalSimple, 0)

	for _, event := range events {
		eventExts = append(eventExts, event.ExternalizeSimple())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(eventExts); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleListEvents lists the events that match certain conditions in a project
func (app *App) HandleGetEvent(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

	if err != nil {
		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
			Code:   ErrReleaseReadData,
			Errors: []string{"cluster not found"},
		}, w)
	}

	eventID, err := strconv.ParseUint(chi.URLParam(r, "event_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	event, err := app.Repo.Event.ReadEvent(uint(eventID), uint(projID), uint(clusterID))

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}

		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	eventExt := event.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(eventExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
