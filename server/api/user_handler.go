package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"gorm.io/gorm"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/internal/auth/token"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/integrations/email"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	segment "gopkg.in/segmentio/analytics-go.v3"
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
		// send to segment
		client := *app.segmentClient

		client.Enqueue(segment.Identify{
			UserId: fmt.Sprintf("%v", user.ID),
			Traits: segment.NewTraits().
				SetEmail(user.Email).
				Set("github", "false"),
		})

		client.Enqueue(segment.Track{
			UserId: fmt.Sprintf("%v", user.ID),
			Event:  "New User",
			Properties: segment.NewProperties().
				Set("email", user.Email),
		})

		app.Logger.Info().Msgf("New user created: %d", user.ID)
		var redirect string

		if valR := session.Values["redirect"]; valR != nil {
			redirect = session.Values["redirect"].(string)
		}

		session.Values["authenticated"] = true
		session.Values["user_id"] = user.ID
		session.Values["email"] = user.Email
		session.Values["redirect"] = ""
		session.Save(r, w)

		w.WriteHeader(http.StatusCreated)

		if err := app.sendUser(w, user.ID, user.Email, false, redirect); err != nil {
			app.handleErrorFormDecoding(err, ErrUserDecode, w)
			return
		}
	}
}

// HandleAuthCheck checks whether current session is authenticated and returns user ID if so.
func (app *App) HandleAuthCheck(w http.ResponseWriter, r *http.Request) {
	// first, check for token
	tok := app.getTokenFromRequest(r)

	if tok != nil {
		// read the user
		user, err := app.Repo.User.ReadUser(tok.IBy)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if err := app.sendUser(w, tok.IBy, user.Email, user.EmailVerified, ""); err != nil {
			app.handleErrorFormDecoding(err, ErrUserDecode, w)
			return
		}

		return
	}

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)
	email, _ := session.Values["email"].(string)

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)

	if err := app.sendUser(w, userID, email, user.EmailVerified, ""); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}
}

// HandleCLILoginUser verifies that a user is logged in, and generates an access
// token for usage from the CLI
func (app *App) HandleCLILoginUser(w http.ResponseWriter, r *http.Request) {
	queryParams, _ := url.ParseQuery(r.URL.RawQuery)

	redirect := queryParams["redirect"][0]

	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userID, _ := session.Values["user_id"].(uint)

	// generate the token
	jwt, err := token.GetTokenForUser(userID)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	encoded, err := jwt.EncodeToken(&token.TokenGeneratorConf{
		TokenSecret: app.ServerConf.TokenGeneratorSecret,
	})

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// generate 64 characters long authorization code
	const letters = "abcdefghijklmnopqrstuvwxyz123456789"
	code := make([]byte, 64)

	for i := range code {
		code[i] = letters[rand.Intn(len(letters))]
	}

	expiry := time.Now().Add(30 * time.Second)

	// create auth code object and send back authorization code
	authCode := &models.AuthCode{
		Token:             encoded,
		AuthorizationCode: string(code),
		Expiry:            &expiry,
	}

	authCode, err = app.Repo.AuthCode.CreateAuthCode(authCode)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	http.Redirect(w, r, fmt.Sprintf("%s/?code=%s", redirect, url.QueryEscape(authCode.AuthorizationCode)), 302)
}

type ExchangeRequest struct {
	AuthorizationCode string `json:"authorization_code"`
}

type ExchangeResponse struct {
	Token string `json:"token"`
}

// HandleCLILoginExchangeToken exchanges an authorization code for a token
func (app *App) HandleCLILoginExchangeToken(w http.ResponseWriter, r *http.Request) {
	// read the request body and look up the authorization token
	req := &ExchangeRequest{}

	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		app.handleErrorFormDecoding(err, ErrUserDecode, w)
		return
	}

	authCode, err := app.Repo.AuthCode.ReadAuthCode(req.AuthorizationCode)

	if err != nil || authCode.IsExpired() {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	res := &ExchangeResponse{
		Token: authCode.Token,
	}

	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(res); err != nil {
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

	var redirect string

	if valR := session.Values["redirect"]; valR != nil {
		redirect = session.Values["redirect"].(string)
	}

	// Set user as authenticated
	session.Values["authenticated"] = true
	session.Values["user_id"] = storedUser.ID
	session.Values["email"] = storedUser.Email
	session.Values["redirect"] = ""

	if err := session.Save(r, w); err != nil {
		app.Logger.Warn().Err(err)
	}

	w.WriteHeader(http.StatusOK)

	if err := app.sendUser(w, storedUser.ID, storedUser.Email, storedUser.EmailVerified, redirect); err != nil {
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

// InitiateEmailVerifyUser initiates the email verification flow for a logged-in user
func (app *App) InitiateEmailVerifyUser(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	// error already handled by helper
	if err != nil {
		return
	}

	form := &forms.InitiateResetUserPasswordForm{
		Email: user.Email,
	}

	// convert the form to a pw reset token model
	pwReset, rawToken, err := form.ToPWResetToken()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	pwReset, err = app.Repo.PWResetToken.CreatePWResetToken(pwReset)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	queryVals := url.Values{
		"token":    []string{rawToken},
		"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
	}

	sgClient := email.SendgridClient{
		APIKey:                app.ServerConf.SendgridAPIKey,
		VerifyEmailTemplateID: app.ServerConf.SendgridVerifyEmailTemplateID,
		SenderEmail:           app.ServerConf.SendgridSenderEmail,
	}

	err = sgClient.SendEmailVerification(
		fmt.Sprintf("%s/api/email/verify/finalize?%s", app.ServerConf.ServerURL, queryVals.Encode()),
		form.Email,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// FinalizEmailVerifyUser completes the email verification flow for a user.
func (app *App) FinalizEmailVerifyUser(w http.ResponseWriter, r *http.Request) {
	userID, err := app.getUserIDFromRequest(r)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	user, err := app.Repo.User.ReadUser(userID)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	vals, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Invalid email verification URL"), 302)
		return
	}

	var tokenStr string
	var tokenID uint

	if tokenArr, ok := vals["token"]; ok && len(tokenArr) == 1 {
		tokenStr = tokenArr[0]
	} else {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Invalid email verification URL: token required"), 302)
		return
	}

	if tokenIDArr, ok := vals["token_id"]; ok && len(tokenIDArr) == 1 {
		id, err := strconv.ParseUint(tokenIDArr[0], 10, 64)

		if err != nil {
			http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Invalid email verification URL: valid token id required"), 302)
			return
		}

		tokenID = uint(id)
	} else {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Invalid email verification URL: valid token id required"), 302)
		return
	}

	// verify the token is valid
	token, err := app.Repo.PWResetToken.ReadPWResetToken(tokenID)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Email verification error: valid token required"), 302)
		return
	}

	// make sure the token is still valid and has not expired
	if !token.IsValid || token.IsExpired() {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Email verification error: valid token required"), 302)
		return
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(tokenStr)); err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Email verification error: valid token required"), 302)
		return
	}

	user.EmailVerified = true

	user, err = app.Repo.User.UpdateUser(user)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	// invalidate the token
	token.IsValid = false

	_, err = app.Repo.PWResetToken.UpdatePWResetToken(token)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
	return
}

// InitiatePWResetUser initiates the password reset flow based on an email. The endpoint
// checks if the email exists, but returns a 200 status code regardless, since we don't
// want to leak in-use emails
func (app *App) InitiatePWResetUser(w http.ResponseWriter, r *http.Request) {
	form := &forms.InitiateResetUserPasswordForm{}

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

	// check that the email exists; return 200 status code even if it doesn't
	user, err := app.Repo.User.ReadUserByEmail(form.Email)

	if err == gorm.ErrRecordNotFound {
		w.WriteHeader(http.StatusOK)
		return
	} else if err != nil {
		app.handleErrorDataRead(err, w)
		return
	}

	// if the user is a Github user, send them a Github email
	if user.GithubUserID != 0 {
		sgClient := email.SendgridClient{
			APIKey:         app.ServerConf.SendgridAPIKey,
			PWGHTemplateID: app.ServerConf.SendgridPWGHTemplateID,
			SenderEmail:    app.ServerConf.SendgridSenderEmail,
		}

		err = sgClient.SendGHPWEmail(
			fmt.Sprintf("%s/api/oauth/login/github", app.ServerConf.ServerURL),
			form.Email,
		)

		if err != nil {
			app.handleErrorInternal(err, w)
			return
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	// convert the form to a project model
	pwReset, rawToken, err := form.ToPWResetToken()

	if err != nil {
		app.handleErrorFormDecoding(err, ErrProjectDecode, w)
		return
	}

	// handle write to the database
	pwReset, err = app.Repo.PWResetToken.CreatePWResetToken(pwReset)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	queryVals := url.Values{
		"token":    []string{rawToken},
		"email":    []string{form.Email},
		"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
	}

	sgClient := email.SendgridClient{
		APIKey:            app.ServerConf.SendgridAPIKey,
		PWResetTemplateID: app.ServerConf.SendgridPWResetTemplateID,
		SenderEmail:       app.ServerConf.SendgridSenderEmail,
	}

	err = sgClient.SendPWResetEmail(
		fmt.Sprintf("%s/password/reset/finalize?%s", app.ServerConf.ServerURL, queryVals.Encode()),
		form.Email,
	)

	if err != nil {
		app.handleErrorInternal(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// VerifyPWResetUser makes sure that the token is correct and still valid
func (app *App) VerifyPWResetUser(w http.ResponseWriter, r *http.Request) {
	form := &forms.VerifyResetUserPasswordForm{}

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

	token, err := app.Repo.PWResetToken.ReadPWResetToken(form.PWResetTokenID)

	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// make sure the token is still valid and has not expired
	if !token.IsValid || token.IsExpired() {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// check that the email matches
	if token.Email != form.Email {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(form.Token)); err != nil {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

// FinalizPWResetUser completes the password reset flow based on an email.
func (app *App) FinalizPWResetUser(w http.ResponseWriter, r *http.Request) {
	form := &forms.FinalizeResetUserPasswordForm{}

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

	// verify the token is valid
	token, err := app.Repo.PWResetToken.ReadPWResetToken(form.PWResetTokenID)

	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// make sure the token is still valid and has not expired
	if !token.IsValid || token.IsExpired() {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// check that the email matches
	if token.Email != form.Email {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(form.Token)); err != nil {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	// check that the email exists
	user, err := app.Repo.User.ReadUserByEmail(form.Email)

	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	hashedPW, err := bcrypt.GenerateFromPassword([]byte(form.NewPassword), 8)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	user.Password = string(hashedPW)

	user, err = app.Repo.User.UpdateUser(user)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	// invalidate the token
	token.IsValid = false

	_, err = app.Repo.PWResetToken.UpdatePWResetToken(token)

	if err != nil {
		app.handleErrorDataWrite(err, w)
		return
	}

	w.WriteHeader(http.StatusOK)
	return
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

type SendUserExt struct {
	ID            uint   `json:"id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Redirect      string `json:"redirect,omitempty"`
}

func (app *App) sendUser(w http.ResponseWriter, userID uint, email string, emailVerified bool, redirect string) error {
	resUser := &SendUserExt{
		ID:            userID,
		Email:         email,
		EmailVerified: emailVerified,
		Redirect:      redirect,
	}

	if err := json.NewEncoder(w).Encode(resUser); err != nil {
		return err
	}
	return nil
}

func (app *App) getUserIDFromRequest(r *http.Request) (uint, error) {
	session, err := app.Store.Get(r, app.ServerConf.CookieName)

	if err != nil {
		return 0, err
	}

	// first, check for token
	tok := app.getTokenFromRequest(r)

	if tok != nil {
		return tok.IBy, nil
	}

	userID, _ := session.Values["user_id"].(uint)

	return userID, nil
}
