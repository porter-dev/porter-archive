package user

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/notifier"
)

type VerifyEmailInitiateHandler struct {
	handlers.PorterHandler
}

func NewVerifyEmailInitiateHandler(
	config *config.Config,
) *VerifyEmailInitiateHandler {
	return &VerifyEmailInitiateHandler{
		PorterHandler: handlers.NewDefaultPorterHandler(config, nil, nil),
	}
}

func (v *VerifyEmailInitiateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	err := startEmailVerification(v.Config(), w, r, user)

	if err != nil {
		v.HandleAPIError(w, r, apierrors.NewErrInternal(err))
	}
}

type VerifyEmailFinalizeHandler struct {
	handlers.PorterHandlerReader
}

func NewVerifyEmailFinalizeHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
) *VerifyEmailFinalizeHandler {
	return &VerifyEmailFinalizeHandler{
		PorterHandlerReader: handlers.NewDefaultPorterHandler(config, decoderValidator, nil),
	}
}

func (v *VerifyEmailFinalizeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	request := &types.VerifyEmailFinalizeRequest{}

	if err := v.DecodeAndValidateNoWrite(r, request); err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape(err.Error()), 302)
		return
	}

	token, err := VerifyToken(
		v.Repo().PWResetToken(),
		handlers.IgnoreAPIError,
		w,
		r,
		&request.VerifyTokenFinalizeRequest,
		user.Email,
	)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Email verification error: valid token required"), 302)
		return
	}

	user.EmailVerified = true

	user, err = v.Repo().User().UpdateUser(user)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	// invalidate the token
	token.IsValid = false

	_, err = v.Repo().PWResetToken().UpdatePWResetToken(token)

	if err != nil {
		http.Redirect(w, r, "/dashboard?error="+url.QueryEscape("Could not verify email address"), 302)
		return
	}

	v.Config().AnalyticsClient.Track(analytics.UserVerifyEmailTrack(&analytics.UserVerifyEmailTrackOpts{
		UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
		Email:               user.Email,
	}))

	http.Redirect(w, r, "/dashboard", 302)
	return
}

func startEmailVerification(
	config *config.Config,
	w http.ResponseWriter, r *http.Request,
	user *models.User,
) error {
	pwReset, rawToken, err := CreatePWResetTokenForEmail(
		config.Repo.PWResetToken(),
		handlers.IgnoreAPIError,
		w,
		r,
		&types.InitiateResetUserPasswordRequest{
			Email: user.Email,
		},
	)

	if err != nil {
		return err
	}

	queryVals := url.Values{
		"token":    []string{rawToken},
		"token_id": []string{fmt.Sprintf("%d", pwReset.ID)},
	}

	return config.UserNotifier.SendEmailVerification(
		&notifier.SendEmailVerificationOpts{
			Email: user.Email,
			URL:   fmt.Sprintf("%s/api/email/verify/finalize?%s", config.ServerConf.ServerURL, queryVals.Encode()),
		},
	)
}
