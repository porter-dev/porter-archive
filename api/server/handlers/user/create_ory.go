package user

import (
	"errors"
	"net/http"

	"github.com/porter-dev/porter/internal/analytics"

	"github.com/porter-dev/porter/internal/telemetry"

	"gorm.io/gorm"

	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/internal/models"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
)

// OryUserCreateHandler is the handler for user creation triggered by an ory action
type OryUserCreateHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewOryUserCreateHandler generates a new OryUserCreateHandler
func NewOryUserCreateHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *OryUserCreateHandler {
	return &OryUserCreateHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

// CreateOryUserRequest is the expected request body for user creation triggered by an ory action
type CreateOryUserRequest struct {
	OryId    string `json:"ory_id"`
	Email    string `json:"email"`
	Referral string `json:"referral"`
}

// ServeHTTP handles the user creation triggered by an ory action
func (u *OryUserCreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-ory-user")
	defer span.End()

	// this endpoint is not authenticated through middleware; instead, we check
	// for the presence of an ory action cookie that matches env
	oryActionCookie, err := r.Cookie("ory_action")
	if err != nil {
		err = telemetry.Error(ctx, span, err, "invalid ory action cookie")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	if oryActionCookie.Value != u.Config().OryActionKey {
		err = telemetry.Error(ctx, span, nil, "cookie does not match")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusForbidden))
		return
	}

	request := &CreateOryUserRequest{}
	ok := u.DecodeAndValidate(w, r, request)
	if !ok {
		err = telemetry.Error(ctx, span, nil, "invalid request")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "email", Value: request.Email},
		telemetry.AttributeKV{Key: "ory-id", Value: request.OryId},
		telemetry.AttributeKV{Key: "referral", Value: request.Referral},
	)

	if request.Email == "" {
		err = telemetry.Error(ctx, span, nil, "email is required")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}
	if request.OryId == "" {
		err = telemetry.Error(ctx, span, nil, "ory_id is required")
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	user := &models.User{
		Model:         gorm.Model{},
		Email:         request.Email,
		EmailVerified: false,
		AuthProvider:  models.AuthProvider_Ory,
		ExternalId:    request.OryId,
	}

	existingUser, err := u.Repo().User().ReadUserByEmail(user.Email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		err = telemetry.Error(ctx, span, err, "error reading user by email")
		u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	if existingUser == nil || existingUser.ID == 0 {
		user, err = u.Repo().User().CreateUser(user)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating user")
			u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		u.Config().AnalyticsClient.Identify(analytics.CreateSegmentIdentifyUser(user))

		u.Config().AnalyticsClient.Track(analytics.UserCreateTrack(&analytics.UserCreateTrackOpts{
			UserScopedTrackOpts: analytics.GetUserScopedTrackOpts(user.ID),
			Email:               user.Email,
			FirstName:           user.FirstName,
			LastName:            user.LastName,
			CompanyName:         user.CompanyName,
			ReferralMethod:      request.Referral,
		}))
	} else {
		existingUser.AuthProvider = models.AuthProvider_Ory
		existingUser.ExternalId = request.OryId
		_, err = u.Repo().User().UpdateUser(existingUser)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error updating user")
			u.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}
}
