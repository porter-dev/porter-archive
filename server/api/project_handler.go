package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
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
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

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
	projModel, err := form.ToProject(app.Repo.Project())

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	projModel, err = app.Repo.Project().CreateProject(projModel)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// create a new Role with the user as the admin
	_, err = app.Repo.Project().CreateProjectRole(projModel, &models.Role{
		Role: types.Role{
			UserID:    userID,
			ProjectID: projModel.ID,
			Kind:      types.RoleAdmin,
		},
	})

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.AnalyticsClient.Track(analytics.ProjectCreateTrack(&analytics.ProjectCreateTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(userID, projModel.ID),
	}))

	app.Logger.Info().Msgf("New project created: %d", projModel.ID)

	w.WriteHeader(http.StatusCreated)

	projExt := projModel.ToProjectType()

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleGetProjectRoles lists the roles available to the project. For now, these
// roles are static.
func (app *App) HandleGetProjectRoles(w http.ResponseWriter, r *http.Request) {
	roles := []string{models.RoleAdmin, models.RoleDeveloper, models.RoleViewer}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(&roles); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

type Collaborator struct {
	ID        uint   `json:"id"`
	Kind      string `json:"kind"`
	UserID    uint   `json:"user_id"`
	Email     string `json:"email"`
	ProjectID uint   `json:"project_id"`
}

// HandleListProjectCollaborators lists the collaborators in the project
func (app *App) HandleListProjectCollaborators(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	roles, err := app.Repo.Project().ListProjectRoles(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	res := make([]*Collaborator, 0)
	roleMap := make(map[uint]*models.Role)
	idArr := make([]uint, 0)

	for _, role := range roles {
		roleCp := role
		roleMap[role.UserID] = &roleCp
		idArr = append(idArr, role.UserID)
	}

	users, err := app.Repo.User().ListUsersByIDs(idArr)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	for _, user := range users {
		res = append(res, &Collaborator{
			ID:        roleMap[user.ID].ID,
			Kind:      string(roleMap[user.ID].Kind),
			UserID:    roleMap[user.ID].UserID,
			Email:     user.Email,
			ProjectID: roleMap[user.ID].ProjectID,
		})
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(res); err != nil {
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

	proj, err := app.Repo.Project().ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExt := proj.ToProjectType()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleReadProjectPolicy returns the policy document given the current user
func (app *App) HandleReadProjectPolicy(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	role, err := app.Repo.Project().ReadProjectRole(uint(id), userID)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	// case on the role to get the policy document
	var policy types.Policy
	switch role.Kind {
	case types.RoleAdmin:
		policy = types.AdminPolicy
	case types.RoleDeveloper:
		policy = types.DeveloperPolicy
	case types.RoleViewer:
		policy = types.ViewerPolicy
	}

	if err := json.NewEncoder(w).Encode(policy); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleUpdateProjectRole updates a project role with a new "kind"
func (app *App) HandleUpdateProjectRole(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	userID, err := strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	role, err := app.Repo.Project().ReadProjectRole(uint(id), uint(userID))

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	form := &forms.UpdateProjectRoleForm{}

	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	role.Kind = types.RoleKind(form.Kind)

	role, err = app.Repo.Project().UpdateProjectRole(uint(id), role)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	if err := json.NewEncoder(w).Encode(role.Externalize()); err != nil {
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

	proj, err := app.Repo.Project().ReadProject(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	proj, err = app.Repo.Project().DeleteProject(proj)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	projExternal := proj.ToProjectType()

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projExternal); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDeleteProjectRole deletes a project role from the db, reading from the project_id
// in the URL param
func (app *App) HandleDeleteProjectRole(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	userID, err := strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	role, err := app.Repo.Project().ReadProjectRole(uint(id), uint(userID))

	if err != nil {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	role, err = app.Repo.Project().DeleteProjectRole(uint(id), uint(userID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	if err := json.NewEncoder(w).Encode(role.Externalize()); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}
