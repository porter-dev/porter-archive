package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"
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
	form := &forms.CreateUserForm{}

	user, err := app.writeUser(
		form,
		app.repo.User.CreateUser,
		w,
		r,
		doesUserExist,
	)

	if err == nil {
		app.logger.Info().Msgf("New user created: %d", user.ID)
		w.WriteHeader(http.StatusCreated)
	}
}

// HandleAuthCheck checks whether current session is authenticated.
func (app *App) HandleAuthCheck(w http.ResponseWriter, r *http.Request) {
	session, err := app.store.Get(r, "cookie-name")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	if auth, ok := session.Values["authenticated"].(bool); !auth || !ok {
		app.logger.Info().Msgf("auth")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("false"))
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("true"))
}

// HandleLoginUser checks the request header for cookie and validates the user.
func (app *App) HandleLoginUser(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, "cookie-name")
	form := &forms.LoginUserForm{}
	app.logger.Info().Msgf("Login")
	// decode from JSON to form value
	if err := json.NewDecoder(r.Body).Decode(form); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	storedUser, readErr := app.repo.User.ReadUserByEmail(form.Email)

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

// HandleReadUserClusters returns the externalized User.Clusters (models.ClusterConfigs)
// based on a user ID
func (app *App) HandleReadUserClusters(w http.ResponseWriter, r *http.Request) {
	user, err := app.readUser(w, r)

	// error already handled by helper
	if err != nil {
		return
	}

	extClusters := make([]models.ClusterConfigExternal, 0)

	for _, cluster := range user.Clusters {
		extClusters = append(extClusters, *cluster.Externalize())
	}

	if err := json.NewEncoder(w).Encode(extClusters); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HandleReadUserClustersAll returns all models.ClusterConfigs parsed from a KubeConfig
// that is attached to a specific user, identified through the user ID
func (app *App) HandleReadUserClustersAll(w http.ResponseWriter, r *http.Request) {
	user, err := app.readUser(w, r)

	// if there is an error, it's already handled by helper
	if err == nil {
		clusters, err := kubernetes.GetAllClusterConfigsFromBytes(user.RawKubeConfig)

		if err != nil {
			app.handleErrorFormDecoding(err, ErrUserDecode, w)
			return
		}

		extClusters := make([]models.ClusterConfigExternal, 0)

		for _, cluster := range clusters {
			extClusters = append(extClusters, *cluster.Externalize())
		}

		if err := json.NewEncoder(w).Encode(extClusters); err != nil {
			app.handleErrorFormDecoding(err, ErrUserDecode, w)
			return
		}

		w.WriteHeader(http.StatusOK)
	}
}

// HandleUpdateUser validates an update user form entry, updates the user
// in the database, and writes status accepted
func (app *App) HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	form := &forms.UpdateUserForm{
		ID: uint(id),
	}

	user, err := app.writeUser(form, app.repo.User.UpdateUser, w, r)

	if err == nil {
		app.logger.Info().Msgf("User updated: %d", user.ID)
		w.WriteHeader(http.StatusNoContent)
	}
}

// HandleDeleteUser removes a user after checking that the sent password is correct
func (app *App) HandleDeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(chi.URLParam(r, "id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	// TODO -- HASH AND VERIFY PASSWORD BEFORE USER DELETION
	form := &forms.DeleteUserForm{
		ID: uint(id),
	}

	user, err := app.writeUser(form, app.repo.User.DeleteUser, w, r)

	if err == nil {
		app.logger.Info().Msgf("User deleted: %d", user.ID)
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
	userModel, err := form.ToUser()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return nil, err
	}

	// Check any additional validators for any semantic errors
	// We have completed all syntax checks, so these will be sent
	// with http.StatusUnprocessableEntity (422), unless this is
	// an internal server error
	for _, validator := range validators {
		err := validator(app.repo, userModel)

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
	id, err := strconv.ParseUint(chi.URLParam(r, "id"), 0, 64)

	if err != nil || id == 0 {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return nil, err
	}

	user, err := app.repo.User.ReadUser(uint(id))

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
