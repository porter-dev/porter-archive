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
	ctx, span := telemetry.NewSpan(r.Context(), "auth-endpoint-api-token")
	defer span.End()

	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		err := telemetry.Error(ctx, span, reqErr, "error deleting payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	err := c.Config().BillingManager.DeletePaymentMethod(paymentMethodID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error deleting payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}
