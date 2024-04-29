package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListUserReferralsHandler is a handler for getting a list of user referrals
type ListUserReferralsHandler struct {
	handlers.PorterHandlerWriter
}

// NewListUserReferralsHandler returns an instance of ListUserReferralsHandler
func NewListUserReferralsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListUserReferralsHandler {
	return &ListUserReferralsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (u *ListUserReferralsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-user-referrals")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)

	referralCount, err := u.Repo().Referral().GetReferralCountByUserID(user.ID)
	if err != nil {
		u.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	referralResponse := struct {
		ReferralCount int `json:"count"`
	}{
		ReferralCount: referralCount,
	}

	u.WriteResult(w, r, referralResponse)
}

// GetUserReferralDetailsHandler is a handler for getting a user's referral code
type GetUserReferralDetailsHandler struct {
	handlers.PorterHandlerWriter
}

// NewGetUserReferralDetailsHandler returns an instance of GetUserReferralCodeHandler
func NewGetUserReferralDetailsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetUserReferralDetailsHandler {
	return &GetUserReferralDetailsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (u *GetUserReferralDetailsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-user-referral-details")
	defer span.End()

	user, _ := ctx.Value(types.UserScope).(*models.User)

	referralCodeResponse := struct {
		Code          string `json:"code"`
		RewardClaimed bool   `json:"reward_claimed"`
	}{
		Code:          user.ReferralCode,
		RewardClaimed: user.ReferralRewardClaimed,
	}

	u.WriteResult(w, r, referralCodeResponse)
}
