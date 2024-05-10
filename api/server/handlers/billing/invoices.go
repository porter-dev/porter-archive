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
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListCustomerInvoicesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-payment-methods")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "lago-config-exists", Value: c.Config().BillingManager.LagoConfigLoaded},
		telemetry.AttributeKV{Key: "lago-enabled", Value: proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "porter-cloud-enabled", Value: proj.EnableSandbox},
	)

	if !c.Config().BillingManager.LagoConfigLoaded || !proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	invoices, err := c.Config().BillingManager.LagoClient.ListCustomerFinalizedInvoices(ctx, proj.ID, proj.EnableSandbox)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing invoices")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusInternalServerError))
		return
	}

	c.WriteResult(w, r, invoices)
}
