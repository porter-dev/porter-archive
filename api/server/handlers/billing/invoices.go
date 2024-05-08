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

// ListCustomerInvoicesHandler is a handler for listing payment methods
type ListCustomerInvoicesHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListCustomerInvoicesHandler will create a new ListCustomerInvoicesHandler
func NewListCustomerInvoicesHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListCustomerInvoicesHandler {
	return &ListCustomerInvoicesHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListCustomerInvoicesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-payment-methods")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "billing-config-exists", Value: c.Config().BillingManager.StripeConfigLoaded},
		telemetry.AttributeKV{Key: "billing-enabled", Value: proj.GetFeatureFlag(models.BillingEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "porter-cloud-enabled", Value: proj.EnableSandbox},
	)

	if !c.Config().BillingManager.StripeConfigLoaded || !proj.GetFeatureFlag(models.BillingEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	req := &types.ListCustomerInvoicesRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding list customer usage request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	// Write the response to the frontend
	c.WriteResult(w, r, "invoices")
}
