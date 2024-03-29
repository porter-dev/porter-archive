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

// DeleteBillingHandler is a handler for deleting payment methods
type DeleteBillingHandler struct {
	handlers.PorterHandlerWriter
}

// NewDeleteBillingHandler will create a new DeleteBillingHandler
func NewDeleteBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *DeleteBillingHandler {
	return &DeleteBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *DeleteBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "delete-billing-endpoint")
	defer span.End()

	user, _ := r.Context().Value(types.UserScope).(*models.User)
	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error deleting payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	err := c.Config().BillingManager.DeletePaymentMethod(ctx, paymentMethodID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error deleting payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "payment-method-id", Value: paymentMethodID},
	)

	err = c.Config().AnalyticsClient.Track(analytics.PaymentMethodDettachedTrack(&analytics.PaymentMethodCreateDeleteTrackOpts{
		ProjectScopedTrackOpts: analytics.GetProjectScopedTrackOpts(user.ID, proj.ID),
	}))
	if err != nil {
		telemetry.Error(ctx, span, err, "error creating payment method track")
	}

	c.WriteResult(w, r, "")
}
