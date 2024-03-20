package billing

import (
	"fmt"
	"log"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentmethod"
)

type DeleteBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewDeleteBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *DeleteBillingHandler {
	return &DeleteBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *DeleteBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	stripe.Key = c.Config().ServerConf.StripeSecretKey

	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", fmt.Errorf("invalid id parameter"))))
		return
	}

	result, err := paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	log.Println(result)

	c.WriteResult(w, r, result)
}
