package billing

import (
	"fmt"
	"net/http"

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
	ctx, span := telemetry.NewSpan(r.Context(), "create-billing-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	clientSecret, err := c.Config().BillingManager.CreatePaymentMethod(ctx, proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating payment method: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
	)

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
	ctx, span := telemetry.NewSpan(r.Context(), "set-default-billing-endpoint")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error setting default payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error setting default payment method: %w", err)))
		return
	}

	err := c.Config().BillingManager.SetDefaultPaymentMethod(ctx, paymentMethodID, proj)
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
	}))

	c.WriteResult(w, r, "")
}
