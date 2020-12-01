package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// Enumeration of user API error codes, represented as int64
const (
	ErrProjectDecode ErrorCode = iota + 600
	ErrProjectValidateFields
	ErrProjectDataRead
)

// HandleCreateProject validates a project form entry, converts the project to a gorm
// model, and saves the user to the database
func (app *App) HandleCreateProject(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, app.cookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	form := &forms.CreateProjectForm{}

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

	// convert the form to a project model
	projModel, err := form.ToProject(app.repo.Project)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	projModel, err = app.repo.Project.CreateProject(projModel)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// create a new Role with the user as the admin
	_, err = app.repo.Project.CreateProjectRole(projModel, &models.Role{
		UserID:    userID,
		ProjectID: projModel.ID,
		Kind:      models.RoleAdmin,
	})

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.logger.Info().Msgf("New project created: %d", projModel.ID)

	w.WriteHeader(http.StatusCreated)

	projExt := projModel.Externalize()

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleReadProject returns an externalized Project (models.ProjectExternal)
// based on an ID
func (app *App) HandleReadProject(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	proj, err := app.repo.Project.ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExt := proj.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDeleteProject deletes a project from the db, reading from the project_id
// in the URL param
func (app *App) HandleDeleteProject(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	proj, err := app.repo.Project.ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	proj, err = app.repo.Project.DeleteProject(proj)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExternal := proj.Externalize()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExternal); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
