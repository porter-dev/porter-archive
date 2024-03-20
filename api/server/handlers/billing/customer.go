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
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/customer"
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

	stripe.Key = c.Config().ServerConf.StripeSecretKey

	if proj.BillingID == "" {
		// Create customer if not exists
		customerName := fmt.Sprintf("project_%s", proj.Name)
		params := &stripe.CustomerParams{
			Name:  stripe.String(customerName),
			Email: stripe.String(request.UserEmail),
		}

		// Create in Stripe
		customer, err := customer.New(params)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
			return
		}

		// Update the project record with the customer ID
		proj.BillingID = customer.ID
		_, err = c.Repo().Project().UpdateProject(proj)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

	}

	c.WriteResult(w, r, "")
}
