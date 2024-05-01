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
	handlers.PorterHandlerWriter
}

// NewListBillingHandler will create a new ListBillingHandler
func NewListCustomerInvoicesHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListCustomerInvoicesHandler {
	return &ListCustomerInvoicesHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListCustomerInvoicesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-payment-methods")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	invoices, err := c.Config().BillingManager.MetronomeClient.ListInvoices(ctx, proj.UsageID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, invoices)
}
