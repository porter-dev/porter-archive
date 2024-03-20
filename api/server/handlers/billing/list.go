package billing

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentmethod"
)

type ListBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewListBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListBillingHandler {
	return &ListBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	proj, _ := r.Context().Value(types.ProjectScope).(*models.Project)

	stripe.Key = c.Config().ServerConf.StripeSecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	var paymentMethods []*stripe.PaymentMethod

	for result.Next() {
		paymentMethods = append(paymentMethods, result.PaymentMethod())
	}
	c.WriteResult(w, r, paymentMethods)
}
