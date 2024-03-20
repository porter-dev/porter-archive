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

type GetOrCreateBillingCustomerHandler struct {
	handlers.PorterHandlerWriter
}

func NewGetOrCreateBillingCustomerHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetOrCreateBillingCustomerHandler {
	return &GetOrCreateBillingCustomerHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetOrCreateBillingCustomerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	stripe.Key = c.Config().ServerConf.StripeSecretKey

	exists, customerID := c.GetCustomer(proj.Name)
	if !exists {
		// Create customer if not exists
		params := &stripe.CustomerParams{
			Name:  stripe.String(proj.Name),
			Email: stripe.String(""),
		}
		_, err := customer.New(params)
		if err != nil {
			c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
			return
		}
	}

	c.WriteResult(w, r, customerID)
}

func (c *GetOrCreateBillingCustomerHandler) GetCustomer(projectName string) (bool, string) {
	customerQuery := fmt.Sprintf("name:'%s'", projectName)

	params := &stripe.CustomerSearchParams{
		SearchParams: stripe.SearchParams{
			Query: customerQuery,
		},
	}
	result := customer.Search(params)

	if !result.Next() {
		return false, ""
	}

	result.Current()
	return true, ""
}
