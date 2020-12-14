package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"gorm.io/gorm"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// Enumeration of user API error codes, represented as int64
const (
	ErrUserDecode ErrorCode = iota + 600
	ErrUserValidateFields
	ErrUserDataRead
)

// HandleCreateUser validates a user form entry, converts the user to a gorm
// model, and saves the user to the database
func (app *App) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		app.handleErrorDataRead(err, w)
	}

	form := &forms.CreateUserForm{}

	user, err := app.writeUser(
		form,
		app.Repo.User.CreateUser,
		w,
		r,
		doesUserExist,
	)

	if err == nil {
		app.Logger.Info().Msgf("New user created: %d", user.ID)
		session.Values["authenticated"] = true
		session.Values["user_id"] = user.ID
		session.Values["email"] = user.Email
		session.Save(r, w)

		w.WriteHeader(http.StatusCreated)

		if err := app.sendUser(w, user.ID, user.Email); err != nil {
			app.handleErrorFormDecoding(err, ErrUserDecode, w)
			return
		}
	}
}

// HandleAuthCheck checks whether current session is authenticated and returns user ID if so.
func (app *App) HandleAuthCheck(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	email, _ := session.Values["email"].(string)
	w.WriteHeader(http.StatusOK)

	if err := app.sendUser(w, userID, email); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}
}

// HandleLoginUser checks the request header for cookie and validates the user.
func (app *App) HandleLoginUser(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	form := &forms.LoginUserForm{}
	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	storedUser, readErr := app.Repo.User.ReadUserByEmail(form.Email)

	if readErr != nil {
		app.sendExternalError(readErr, http.StatusUnauthorized, HTTPError{
			Errors: []string{"email not registered"},
			Code:   http.StatusUnauthorized,
		}, w)

		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(form.Password)); err != nil {
		app.sendExternalError(readErr, http.StatusUnauthorized, HTTPError{
			Errors: []string{"incorrect password"},
			Code:   http.StatusUnauthorized,
		}, w)

		return
	}

	// Set user as authenticated
	session.Values["authenticated"] = true
	session.Values["user_id"] = storedUser.ID
	session.Values["email"] = storedUser.Email
	if err := session.Save(r, w); err != nil {
		app.Logger.Warn().Err(err)
	}

	w.WriteHeader(http.StatusOK)

	if err := app.sendUser(w, storedUser.ID, storedUser.Email); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}
}

// HandleLogoutUser detaches the user from the session
func (app *App) HandleLogoutUser(w http.ResponseWriter, r *http.Request) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		app.handleErrorDataRead(err, w)
	}

	session.Values["authenticated"] = false
	session.Values["user_id"] = nil
	session.Values["email"] = nil
	session.Save(r, w)
	w.WriteHeader(http.StatusOK)
}

// HandleReadUser returns an externalized User (models.UserExternal)
// based on an ID
func (app *App) HandleReadUser(w http.ResponseWriter, r *http.Request) {
	user, err := app.readUser(w, r)

	// error already handled by helper
	if err != nil {
		return
	}

	extUser := user.Externalize()

	if err := json.NewEncoder(w).Encode(extUser); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleListUserProjects lists all projects belonging to a given user
func (app *App) HandleListUserProjects(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	projects, err := app.Repo.Project.ListProjectsByUserID(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrUserDataRead, w)
	}

	projectsExt := make([]*models.ProjectExternal, 0)

	for _, project := range projects {
		projectsExt = append(projectsExt, project.Externalize())
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(projectsExt); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}
}

// HandleDeleteUser removes a user after checking that the sent password is correct
func (app *App) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	// TODO -- HASH AND VERIFY PASSWORD BEFORE USER DELETION
	form := &forms.DeleteUserForm{
		ID: uint(id),
	}

	user, err := app.writeUser(form, app.Repo.User.DeleteUser, w, r)

	if err == nil {
		app.Logger.Info().Msgf("User deleted: %d", user.ID)
		w.WriteHeader(http.StatusNoContent)
	}
}

// ------------------------ User handler helper functions ------------------------ //

// writeUser will take a POST or PUT request to the /api/users endpoint and decode
// the request into a forms.WriteUserForm model, convert it to a models.User, and
// write to the database.
func (app *App) writeUser(
	form forms.WriteUserForm,
	dbWrite repository.WriteUser,
	w http.ResponseWriter,
	r *http.Request,
	validators ...func(repo *repository.Repository, user *models.User) *HTTPError,
) (*models.User, error) {
	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return nil, err
	}

	// validate the form
	if err := app.validator.Struct(form); err != nil {
		app.handleErrorFormValidation(err, ErrUserValidateFields, w)
		return nil, err
	}

	// convert the form to a user model -- WriteUserForm must implement ToUser
	userModel, err := form.ToUser(app.Repo.User)

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return nil, err
	}

	// Check any additional validators for any semantic errors
	// We have completed all syntax checks, so these will be sent
	// with http.StatusUnprocessableEntity (422), unless this is
	// an internal server error
	for _, validator := range validators {
		err := validator(app.Repo, userModel)

		if err != nil {
			goErr := errors.New(strings.Join(err.Errors, ", "))
			if err.Code == 500 {
				app.sendExternalError(
					goErr,
					http.StatusInternalServerError,
					*err,
					w,
				)
			} else {
				app.sendExternalError(
					goErr,
					http.StatusUnprocessableEntity,
					*err,
					w,
				)
			}

			return nil, goErr
		}
	}

	// handle write to the database
	user, err := dbWrite(userModel)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return nil, err
	}

	return user, nil
}

func (app *App) readUser(w http.ResponseWriter, r *http.Request) (*models.User, error) {
	id, err := strconv.ParseUint(chi.URLParam(r, "user_id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return nil, err
	}

	user, err := app.Repo.User.ReadUser(uint(id))

	if err != nil {
		app.handleErrorRead(err, ErrUserDataRead, w)
		return nil, err
	}

	return user, nil
}

func doesUserExist(repo *repository.Repository, user *models.User) *HTTPError {
	user, err := repo.User.ReadUserByEmail(user.Email)

	if user != nil && err == nil {
		return &HTTPError{
			Code: ErrUserValidateFields,
			Errors: []string{
				"email already taken",
			},
		}
	}

	if err != gorm.ErrRecordNotFound {
		return &ErrorDataRead
	}

	return nil
}

func (app *App) sendUser(w http.ResponseWriter, userID uint, email string) error {
	resUser := &models.UserExternal{
		ID:    userID,
		Email: email,
	}
	if err := json.NewEncoder(w).Encode(resUser); err != nil {
		return err
	}
	return nil
}
