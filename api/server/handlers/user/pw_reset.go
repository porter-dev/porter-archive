package user

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"github.com/porter-dev/porter/internal/random"
	"github.com/porter-dev/porter/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserPasswordInitiateResetHandler struct {
	handlers.PorterHandlerReader
}

func NewUserPasswordInitiateResetHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserPasswordInitiateResetHandler {
	return &UserPasswordInitiateResetHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UserPasswordInitiateResetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.InitiateResetUserPasswordRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	// check that the email exists; return 200 status code even if it doesn't
	user, err := c.Repo().User().ReadUserByEmail(request.Email)

	if err == gorm.ErrRecordNotFound {
		w.WriteHeader(http.StatusOK)
		return
	} else if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	// if the user is a Github user, send them a Github email
	if user.GithubUserID != 0 {
		err := c.Config().UserNotifier.SendGithubRelinkEmail(
			&notifier.SendGithubRelinkEmailOpts{
				Email: user.Email,
				URL:   fmt.Sprintf("%s/api/oauth/login/github", c.Config().ServerConf.ServerURL),
			},
		)

		if err != nil {
			c.HandleAPIError(w, apierrors.NewErrInternal(err))
			return
		}

		w.WriteHeader(http.StatusOK)
		return
	}

	// convert the form to a project model
	expiry := time.Now().Add(30 * time.Minute)

	rawToken, err := random.StringWithCharset(32, "")

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	hashedToken, err := bcrypt.GenerateFromPassword([]byte(rawToken), 8)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	pwReset := &models.PWResetToken{
		Email:   request.Email,
		IsValid: true,
		Expiry:  &expiry,
		Token:   string(hashedToken),
	}

	// handle write to the database
	pwReset, err = c.Repo().PWResetToken().CreatePWResetToken(pwReset)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	queryVals := url.Values{
		"token":    []string{rawToken},
		"email":    []string{request.Email},
		"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
	}

	err = c.Config().UserNotifier.SendPasswordResetEmail(
		&notifier.SendPasswordResetEmailOpts{
			Email: user.Email,
			URL:   fmt.Sprintf("%s/password/reset/finalize?%s", c.Config().ServerConf.ServerURL, queryVals.Encode()),
		},
	)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

type UserPasswordVerifyResetHandler struct {
	handlers.PorterHandlerReader
}

func NewUserPasswordVerifyResetHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserPasswordVerifyResetHandler {
	return &UserPasswordVerifyResetHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UserPasswordVerifyResetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.VerifyResetUserPasswordRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	ok, _ = VerifyPasswordResetToken(c.Repo().PWResetToken(), c.HandleAPIError, w, request)

	if ok {
		w.WriteHeader(http.StatusOK)
	}

	return
}

type UserPasswordFinalizeResetHandler struct {
	handlers.PorterHandlerReader
}

func NewUserPasswordFinalizeResetHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UserPasswordFinalizeResetHandler {
	return &UserPasswordFinalizeResetHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UserPasswordFinalizeResetHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	request := &types.FinalizeResetUserPasswordRequest{}

	ok := c.DecodeAndValidate(w, r, request)

	if !ok {
		return
	}

	ok, token := VerifyPasswordResetToken(c.Repo().PWResetToken(), c.HandleAPIError, w, &request.VerifyResetUserPasswordRequest)

	if ok {
		w.WriteHeader(http.StatusOK)
	}

	// check that the email exists
	user, err := c.Repo().User().ReadUserByEmail(request.Email)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			err = fmt.Errorf("finalize password reset failed: email does not exist")
			c.HandleAPIError(w, apierrors.NewErrForbidden(err))
		} else {
			c.HandleAPIError(w, apierrors.NewErrInternal(err))
		}

		return
	}

	hashedPW, err := bcrypt.GenerateFromPassword([]byte(request.NewPassword), 8)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	user.Password = string(hashedPW)

	user, err = c.Repo().User().UpdateUser(user)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	// invalidate the token
	token.IsValid = false

	_, err = c.Repo().PWResetToken().UpdatePWResetToken(token)

	if err != nil {
		c.HandleAPIError(w, apierrors.NewErrInternal(err))
		return
	}

	w.WriteHeader(http.StatusOK)
	return
}

func VerifyPasswordResetToken(
	pwResetRepo repository.PWResetTokenRepository,
	handleErr func(w http.ResponseWriter, apiErr apierrors.RequestError),
	w http.ResponseWriter,
	request *types.VerifyResetUserPasswordRequest,
) (bool, *models.PWResetToken) {
	token, err := pwResetRepo.ReadPWResetToken(request.TokenID)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			err = fmt.Errorf("verify/finalize password reset failed: token does not exist")
			handleErr(w, apierrors.NewErrForbidden(err))
		} else {
			handleErr(w, apierrors.NewErrInternal(err))
		}

		return false, nil
	}

	// make sure the token is still valid and has not expired
	if !token.IsValid || token.IsExpired() {
		err = fmt.Errorf("verify password reset failed: expired %t, valid %t", token.IsExpired(), token.IsValid)
		handleErr(w, apierrors.NewErrForbidden(err))

		return false, nil
	}

	// check that the email matches
	if token.Email != request.Email {
		err = fmt.Errorf("verify password reset failed: token email does not match request email")
		handleErr(w, apierrors.NewErrForbidden(err))

		return false, nil
	}

	// make sure the token is correct
	if err := bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(request.Token)); err != nil {
		err = fmt.Errorf("verify password reset failed: %s", err)
		handleErr(w, apierrors.NewErrForbidden(err))

		return false, nil
	}

	return true, token
}
