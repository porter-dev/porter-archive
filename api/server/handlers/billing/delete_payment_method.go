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

type DeletePaymentMethodHandler struct {
	handlers.PorterHandlerWriter
}

func NewDeletePaymentMethodHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *DeletePaymentMethodHandler {
	return &DeletePaymentMethodHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *DeletePaymentMethodHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	stripe.Key = c.Config().ServerConf.StripeSecretKey

	result, err := paymentmethod.Detach("", nil)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	log.Println(result)

	c.WriteResult(w, r, result)
}
