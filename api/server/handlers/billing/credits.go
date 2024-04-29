package billing

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

const (
	// referralRewardRequirement is the number of referred users required to
	// be granted a credits reward
	referralRewardRequirement = 5
	// defaultRewardAmountUSD is the default amount in USD rewarded to users
	// who reach the reward requirement
	defaultRewardAmountUSD = 20
	// defaultPaidAmountUSD is the amount paid by the user to get the credits
	// grant, if set to 0 it means they were free
	defaultPaidAmountUSD = 0
)

// ListCreditsHandler is a handler for getting available credits
type ListCreditsHandler struct {
	handlers.PorterHandlerWriter
}

// NewListCreditsHandler will create a new ListCreditsHandler
func NewListCreditsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListCreditsHandler {
	return &ListCreditsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListCreditsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-credits")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		)
		return
	}

	credits, err := c.Config().BillingManager.MetronomeClient.ListCustomerCredits(ctx, proj.UsageID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing credits")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	c.WriteResult(w, r, credits)
}

// ClaimReferralRewardHandler is a handler for granting credits
type ClaimReferralRewardHandler struct {
	handlers.PorterHandlerWriter
}

// NewClaimReferralReward will create a new GrantCreditsHandler
func NewClaimReferralReward(
	config *config.Config,
	writer shared.ResultWriter,
) *ClaimReferralRewardHandler {
	return &ClaimReferralRewardHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ClaimReferralRewardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-claim-credits-reward")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := ctx.Value(types.UserScope).(*models.User)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		)
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
		telemetry.AttributeKV{Key: "referral-code", Value: user.ReferralCode},
		telemetry.AttributeKV{Key: "referral-reward-received", Value: user.ReferralRewardClaimed},
	)

	if !user.ReferralRewardClaimed {
		err := c.Config().BillingManager.MetronomeClient.CreateCreditsGrant(ctx, proj.UsageID, defaultRewardAmountUSD, defaultPaidAmountUSD)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}

		user.ReferralRewardClaimed = true
		_, err = c.Repo().User().UpdateUser(user)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
			return
		}
	}

	c.WriteResult(w, r, "")
}
