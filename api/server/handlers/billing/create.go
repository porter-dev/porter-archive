package billing

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/analytics"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateBillingHandler is a handler for creating payment methods
type CreateBillingHandler struct {
	handlers.PorterHandlerWriter
}

// SetDefaultBillingHandler is a handler for setting default payment method
type SetDefaultBillingHandler struct {
	handlers.PorterHandlerWriter
}

// NewCreateBillingHandler will create a new CreateBillingHandler
func NewCreateBillingHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBillingHandler {
	return &CreateBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-create-billing-method")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := ctx.Value(types.UserScope).(*models.User)

	clientSecret, err := c.Config().BillingManager.StripeClient.CreatePaymentMethod(ctx, proj.BillingID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating payment method: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
	)

	if proj.EnableSandbox {
		// Grant a reward to the project that referred this user after linking a payment method
		err = c.grantRewardIfReferral(ctx, user.ID)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error granting credits reward")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	c.WriteResult(w, r, clientSecret)
}

// NewSetDefaultBillingHandler will create a new CreateBillingHandler
func NewSetDefaultBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *SetDefaultBillingHandler {
	return &SetDefaultBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *SetDefaultBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-set-default-billing-method")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error setting default payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error setting default payment method: %w", err)))
		return
	}

	err := c.Config().BillingManager.StripeClient.SetDefaultPaymentMethod(ctx, paymentMethodID, proj.BillingID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error setting default payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error setting default payment method: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
		telemetry.AttributeKV{Key: "payment-method-id", Value: paymentMethodID},
	)

	_ = c.Config().AnalyticsClient.Track(analytics.PaymentMethodAttachedTrack(&analytics.PaymentMethodCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
		Email:                  user.Email,
		FirstName:              user.FirstName,
		LastName:               user.LastName,
		CompanyName:            user.CompanyName,
	}))

	c.WriteResult(w, r, "")
}

func (c *CreateBillingHandler) grantRewardIfReferral(ctx context.Context, referredUserID uint) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "grant-referral-reward")
	defer span.End()

	referral, err := c.Repo().Referral().GetReferralByReferredID(referredUserID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to find referral by referred id")
	}

	if referral == nil {
		return nil
	}

	referralCount, err := c.Repo().Referral().CountReferralsByProjectID(referral.ProjectID, models.ReferralStatusCompleted)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to get referral count by referrer id")
	}

	maxReferralRewards := c.Config().BillingManager.LagoClient.MaxReferralRewards
	if referralCount >= maxReferralRewards {
		return nil
	}

	referrerProject, err := c.Repo().Project().ReadProject(referral.ProjectID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to find referrer project")
	}

	if referral != nil && referral.Status != models.ReferralStatusCompleted {
		// Metronome requires an expiration to be passed in, so we set it to 5 years which in
		// practice will mean the credits will most likely run out before expiring
		expiresAt := time.Now().AddDate(5, 0, 0).Format(time.RFC3339)
		reason := "Referral reward"
		rewardAmount := c.Config().BillingManager.LagoClient.DefaultRewardAmountCents
		paidAmount := c.Config().BillingManager.LagoClient.DefaultPaidAmountCents
		err := c.Config().BillingManager.LagoClient.CreateCreditsGrant(ctx, referrerProject.UsageID, reason, rewardAmount, paidAmount, expiresAt)
		if err != nil {
			return telemetry.Error(ctx, span, err, "failed to grand credits reward")
		}

		referral.Status = models.ReferralStatusCompleted
		_, err = c.Repo().Referral().UpdateReferral(referral)
		if err != nil {
			return telemetry.Error(ctx, span, err, "error while updating referral")
		}
	}

	return nil
}
