package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
)

// HandleCreateInvite creates a new invite for a project
func (app *App) HandleCreateInvite(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	form := &forms.CreateInvite{
		ProjectID: uint(projID),
	}

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
	invite, err := form.ToInvite()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	invite, err = app.Repo.Invite.CreateInvite(invite)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	app.Logger.Info().Msgf("New invite created: %d", invite.ID)

	w.WriteHeader(http.StatusCreated)

	inviteExt := invite.Externalize()

	if err := json.NewEncoder(w).Encode(inviteExt); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleAcceptInvite accepts an invite to a new project: if successful, a new role
// is created for that user in the project
func (app *App) HandleAcceptInvite(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	token := chi.URLParam(r, "token")

	if token == "" {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	invite, err := app.Repo.Invite.ReadInviteByToken(token)

	if err != nil || invite.ProjectID != uint(projID) {
		app.sendExternalError(
			err,
			http.StatusForbidden,
			HTTPError{
				Code: http.StatusForbidden,
				Errors: []string{
					"Invalid invite token",
				},
			},
			w,
		)

		return
	}

	// check that the invite has not expired and has not been accepted
	if invite.IsExpired() || invite.IsAccepted() {
		app.sendExternalError(
			err,
			http.StatusForbidden,
			HTTPError{
				Code: http.StatusForbidden,
				Errors: []string{
					"Invite has expired",
				},
			},
			w,
		)

		return
	}

	// check that the invite email matches the user's email
	if user.Email != invite.Email {
		app.sendExternalError(
			err,
			http.StatusForbidden,
			HTTPError{
				Code: http.StatusForbidden,
				Errors: []string{
					"Cannot accept this invite",
				},
			},
			w,
		)

		return
	}

	// create a new role for the user in the project
	projModel, err := app.Repo.Project.ReadProject(uint(projID))

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// create a new Role with the user as the admin
	_, err = app.Repo.Project.CreateProjectRole(projModel, &models.Role{
		UserID:    userID,
		ProjectID: uint(projID),
		Kind:      models.RoleAdmin,
	})

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// update the invite
	invite.UserID = userID

	_, err = app.Repo.Invite.UpdateInvite(invite)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
	return
}

// HandleListProjectInvites returns a list of invites for a project
func (app *App) HandleListProjectInvites(w http.ResponseWriter, r *http.Request) {
	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	invites, err := app.Repo.Invite.ListInvitesByProjectID(uint(projID))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	extInvites := make([]*models.InviteExternal, 0)

	for _, invite := range invites {
		extInvites = append(extInvites, invite.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(extInvites); err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}
}

// HandleDeleteProjectInvite handles the deletion of an Invite via the invite ID
func (app *App) HandleDeleteProjectInvite(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "invite_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	invite, err := app.Repo.Invite.ReadInvite(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	err = app.Repo.Invite.DeleteInvite(invite)

	if err != nil {
		app.handleErrorRead(err, ErrProjectDataRead, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}
