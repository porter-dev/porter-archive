package user

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/forms"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
	"golang.org/x/crypto/bcrypt"
)

type VerifyEmailInitiateHandler struct {
	config *shared.Config
}

func NewVerifyEmailInitiateHandler(
	config *shared.Config,
) *VerifyEmailInitiateHandler {
	return &VerifyEmailInitiateHandler{config}
}

func (v *VerifyEmailInitiateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	pwReset, rawToken, err := CreateTokenForEmail(v.config, user.Email)

	if err != nil {
		apierrors.HandleAPIError(w, v.config.Logger, apierrors.NewErrInternal(err))
		return
	}

	queryVals := url.Values{
		"token":    []string{rawToken},
		"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
	}

	err = v.config.UserNotifier.SendEmailVerification(
		&notifier.SendEmailVerificationOpts{
			Email: user.Email,
			URL:   fmt.Sprintf("%s/api/email/verify/finalize?%s", v.config.ServerConf.ServerURL, queryVals.Encode()),
		},
	)

	if err != nil {
		apierrors.HandleAPIError(w, v.config.Logger, apierrors.NewErrInternal(err))
		return
	}
}

type VerifyEmailFinalizeHandler struct {
	config           *shared.Config
	decoderValidator shared.RequestDecoderValidator
}

func NewVerifyEmailFinalizeHandler(
	config *shared.Config,
	decoderValidator shared.RequestDecoderValidator,
) *VerifyEmailFinalizeHandler {
	return &VerifyEmailFinalizeHandler{config, decoderValidator}
}

func (v *VerifyEmailFinalizeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.VerifyEmailFinalizeRequest{}

	if err := v.decoderValidator.DecodeAndValidateNoWrite(r, request); err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape(err.Error()), 302)
		return
	}

	// verify the token is valid
	token, err := v.config.Repo.PWResetToken().ReadPWResetToken(request.TokenID)

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
	if err := bcrypt.CompareHashAndPassword([]byte(token.Token), []byte(request.Token)); err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Email verification error: valid token required"), 302)
		return
	}

	user.EmailVerified = true

	user, err = v.config.Repo.User().UpdateUser(user)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	// invalidate the token
	token.IsValid = false

	_, err = v.config.Repo.PWResetToken().UpdatePWResetToken(token)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	http.Redirect(w, r, "/dashboard", 302)
	return
}

func CreateTokenForEmail(config *shared.Config, email string) (*models.PWResetToken, string, error) {
	form := &forms.InitiateResetUserPasswordForm{
		Email: email,
	}

	// convert the form to a pw reset token model
	pwReset, rawToken, err := form.ToPWResetToken()

	if err != nil {
		return nil, "", err
	}

	// handle write to the database
	pwReset, err = config.Repo.PWResetToken().CreatePWResetToken(pwReset)

	if err != nil {
		return nil, "", err
	}

	return pwReset, rawToken, nil
}
