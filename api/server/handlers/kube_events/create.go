package kube_events

import (
	"net/http"
	"strings"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type CreateKubeEventHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateKubeEventHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateKubeEventHandler {
	return &CreateKubeEventHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateKubeEventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)

	request := &types.CreateKubeEventRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// handle write to the database
	_, err := c.Repo().KubeEvent().CreateEvent(&models.KubeEvent{
		ProjectID:    proj.ID,
		ClusterID:    cluster.ID,
		ResourceType: request.ResourceType,
		Name:         request.Name,
		OwnerType:    request.OwnerType,
		OwnerName:    request.OwnerName,
		EventType:    request.EventType,
		Namespace:    request.Namespace,
		Message:      request.Message,
		Reason:       request.Reason,
		Timestamp:    request.Timestamp,
		Data:         []byte(strings.Join(request.Data, "\n")),
	})

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// func (app *App) HandleCreateEvent(w http.ResponseWriter, r *http.Request) {
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

// 	if err != nil {
// 		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 			Code:   ErrReleaseReadData,
// 			Errors: []string{"cluster not found"},
// 		}, w)
// 	}

// 	form := &forms.CreateEventForm{}

// 	// decode from JSON to form value
// 	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	// validate the form
// 	if err := app.validator.Struct(form); err != nil {
// 		app.handleErrorFormValidation(err, ErrProjectValidateFields, w)
// 		return
// 	}

// 	// convert the form to an invite
// 	event := form.ToEvent(uint(projID), uint(clusterID))

// 	if err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	// handle write to the database
// 	event, err = app.Repo.Event.CreateEvent(event)

// 	if err != nil {
// 		app.handleErrorDataWrite(err, w)
// 		return
// 	}

// 	w.WriteHeader(http.StatusCreated)
// }

// // HandleListEvents lists the events that match certain conditions in a project
// func (app *App) HandleListEvents(w http.ResponseWriter, r *http.Request) {
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

// 	if err != nil {
// 		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 			Code:   ErrReleaseReadData,
// 			Errors: []string{"cluster not found"},
// 		}, w)
// 	}

// 	vals, err := url.ParseQuery(r.URL.RawQuery)

// 	opts := &repository.ListEventOpts{
// 		ClusterID: uint(clusterID),
// 	}

// 	decoder := schema.NewDecoder()

// 	decoder.IgnoreUnknownKeys(true)

// 	if err := decoder.Decode(opts, vals); err != nil {
// 		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 			Code:   ErrReleaseReadData,
// 			Errors: []string{"bad request"},
// 		}, w)
// 	}

// 	// handle write to the database
// 	events, err := app.Repo.Event.ListEventsByProjectID(uint(projID), opts)

// 	if err != nil {
// 		app.handleErrorDataWrite(err, w)
// 		return
// 	}

// 	eventExts := make([]*models.EventExternalSimple, 0)

// 	for _, event := range events {
// 		eventExts = append(eventExts, event.ExternalizeSimple())
// 	}

// 	w.WriteHeader(http.StatusOK)

// 	if err := json.NewEncoder(w).Encode(eventExts); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}
// }

// // HandleListEvents lists the events that match certain conditions in a project
// func (app *App) HandleGetEvent(w http.ResponseWriter, r *http.Request) {
// 	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	clusterID, err := strconv.ParseUint(chi.URLParam(r, "cluster_id"), 0, 64)

// 	if err != nil {
// 		app.sendExternalError(err, http.StatusInternalServerError, HTTPError{
// 			Code:   ErrReleaseReadData,
// 			Errors: []string{"cluster not found"},
// 		}, w)
// 	}

// 	eventID, err := strconv.ParseUint(chi.URLParam(r, "event_id"), 0, 64)

// 	if err != nil || projID == 0 {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	event, err := app.Repo.Event.ReadEvent(uint(eventID), uint(projID), uint(clusterID))

// 	if err != nil {
// 		if err == gorm.ErrRecordNotFound {
// 			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
// 			return
// 		}

// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}

// 	eventExt := event.Externalize()

// 	w.WriteHeader(http.StatusOK)

// 	if err := json.NewEncoder(w).Encode(eventExt); err != nil {
// 		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
// 		return
// 	}
// }
