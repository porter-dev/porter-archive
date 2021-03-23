package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/integrations/email"
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

	// send invite email
	project, err := app.Repo.Project.ReadProject(uint(projID))

	if err != nil {
		return
	}

	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		return
	}

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		return
	}

	sgClient := email.SendgridClient{
		APIKey:                  app.ServerConf.SendgridAPIKey,
		ProjectInviteTemplateID: app.ServerConf.SendgridProjectInviteTemplateID,
		SenderEmail:             app.ServerConf.SendgridSenderEmail,
	}

	sgClient.SendProjectInviteEmail(
		fmt.Sprintf("%s/api/projects/%d/invites/%s", app.ServerConf.ServerURL, projID, invite.Token),
		project.Name,
		user.Email,
		form.Email,
	)
}

// HandleAcceptInvite accepts an invite to a new project: if successful, a new role
// is created for that user in the project
func (app *App) HandleAcceptInvite(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		acceptInviteError(w, r)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		acceptInviteError(w, r)
		return
	}

	token := chi.URLParam(r, "token")

	if token == "" {
		acceptInviteError(w, r)
		return
	}

	projID, err := strconv.ParseUint(chi.URLParam(r, "project_id"), 0, 64)

	if err != nil || projID == 0 {
		acceptInviteError(w, r)
		return
	}

	invite, err := app.Repo.Invite.ReadInviteByToken(token)

	if err != nil || invite.ProjectID != uint(projID) {
		vals := url.Values{}
		vals.Add("error", "Invalid invite token")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite has not expired and has not been accepted
	if invite.IsExpired() || invite.IsAccepted() {
		vals := url.Values{}
		vals.Add("error", "Invite has expired")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// check that the invite email matches the user's email
	if user.Email != invite.Email {
		vals := url.Values{}
		vals.Add("error", "Wrong email for invite")
		http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)

		return
	}

	// create a new role for the user in the project
	projModel, err := app.Repo.Project.ReadProject(uint(projID))

	if err != nil {
		acceptInviteError(w, r)
		return
	}

	// create a new Role with the user as the admin
	_, err = app.Repo.Project.CreateProjectRole(projModel, &models.Role{
		UserID:    userID,
		ProjectID: uint(projID),
		Kind:      models.RoleAdmin,
	})

	if err != nil {
		acceptInviteError(w, r)
		return
	}

	// update the invite
	invite.UserID = userID

	_, err = app.Repo.Invite.UpdateInvite(invite)

	if err != nil {
		acceptInviteError(w, r)
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
	return
}

func acceptInviteError(w http.ResponseWriter, r *http.Request) {
	vals := url.Values{}
	vals.Add("error", "could not accept invite")
	http.Redirect(w, r, fmt.Sprintf("/dashboard?%s", vals.Encode()), 302)
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
