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
)

type CreateBillingCustomerIfNotExists struct {
	handlers.PorterHandlerReadWriter
}

func NewCreateBillingCustomerIfNotExists(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBillingCustomerIfNotExists {
	return &CreateBillingCustomerIfNotExists{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateBillingCustomerIfNotExists) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	request := &types.CreateBillingCustomerRequest{}
	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	// Create customer in Stripe
	customerID, err := c.Config().BillingManager.CreateCustomer(request.UserEmail, proj)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating billing customer: %w", err)))
		return
	}

	// Update the project record with the customer ID
	proj.BillingID = customerID
	_, err = c.Repo().Project().UpdateProject(proj)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error updating record: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}
