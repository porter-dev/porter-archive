package user

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
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
	// ctx, span := telemetry.NewSpan(r.Context(), "serve-list-user-referrals")
	// defer span.End()

	// user, _ := ctx.Value(types.UserScope).(*models.User)

	// referrals, err := u.Repo().Referral().ListReferralsByUserID(user.ID)
	// if err != nil {
	// 	u.HandleAPIError(w, r, err)
	// 	return
	// }

	u.WriteResult(w, r, "")
}
