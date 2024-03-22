package billing

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListBillingHandler is a handler for listing payment methods
type ListBillingHandler struct {
	handlers.PorterHandlerWriter
}

type CheckPaymentEnabledHandler struct {
	handlers.PorterHandlerWriter
}

// NewListBillingHandler will create a new ListBillingHandler
func NewListBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListBillingHandler {
	return &ListBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "list-payment-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentMethods, err := c.Config().BillingManager.ListPaymentMethod(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, paymentMethods)
}

// NewCheckPaymentEnabledHandler will create a new CheckPaymentEnabledHandler
func NewCheckPaymentEnabledHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *CheckPaymentEnabledHandler {
	return &CheckPaymentEnabledHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *CheckPaymentEnabledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "check-payment-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentEnabled, err := c.Config().BillingManager.CheckPaymentEnabled(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error checking if payment enabled")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error checking if payment enabled: %w", err)))
		return
	}

	c.WriteResult(w, r, paymentEnabled)
}
