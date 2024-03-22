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

// CreateBillingCustomerHandler will create a new handler
// for creating customers in the billing provider
type CreateBillingCustomerHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateBillingCustomerIfNotExists will create a new CreateBillingCustomerIfNotExists
func NewCreateBillingCustomerIfNotExists(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBillingCustomerHandler {
	return &CreateBillingCustomerHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateBillingCustomerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "create-billing-customer-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	request := &types.CreateBillingCustomerRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	if proj.BillingID != "" {
		c.WriteResult(w, r, "")
		return
	}

	// Create customer in Stripe
	customerID, err := c.Config().BillingManager.CreateCustomer(request.UserEmail, proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating billing customer")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating billing customer: %w", err)))
		return
	}

	// Update the project record with the customer ID
	proj.BillingID = customerID
	_, err = c.Repo().Project().UpdateProject(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating project")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error updating project: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}
