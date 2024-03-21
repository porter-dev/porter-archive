package billing

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
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
	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamPaymentMethodID)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", fmt.Errorf("invalid id parameter"))))
		return
	}

	err := c.Config().BillingManager.DeletePaymentMethod(paymentMethodID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error deleting payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}
