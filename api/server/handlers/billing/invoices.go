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
		telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
		telemetry.AttributeKV{Key: "billing-enabled", Value: proj.GetFeatureFlag(models.BillingEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "porter-cloud-enabled", Value: proj.EnableSandbox},
	)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

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

	invoices, err := c.Config().BillingManager.MetronomeClient.ListCustomerInvoices(ctx, proj.UsageID, req.Status)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing customer invoices")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing customer invoices: %w", err)))
		return
	}

	invoices, err = c.Config().BillingManager.StripeClient.PopulateInvoiceURLs(ctx, invoices)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error populating invoice urls")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error populating invoice urls: %w", err)))
		return
	}

	c.WriteResult(w, r, invoices)
}
