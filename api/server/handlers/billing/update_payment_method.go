package billing

import (
	"fmt"
	"log"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentmethod"
)

type UpdatePaymentMethodHandler struct {
	handlers.PorterHandlerWriter
}

func NewUpdatePaymentMethodHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *UpdatePaymentMethodHandler {
	return &UpdatePaymentMethodHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *UpdatePaymentMethodHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	stripe.Key = c.Config().ServerConf.StripeSecretKey
	params := &stripe.PaymentMethodParams{}

	result, err := paymentmethod.Update("", params)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error updating payment method: %w", err)))
		return
	}

	log.Println(result)

	c.WriteResult(w, r, result)
}
