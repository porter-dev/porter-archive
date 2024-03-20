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

type UpdateBillingHandler struct {
	handlers.PorterHandlerWriter
}

func NewUpdateBillingHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdateBillingHandler {
	return &UpdateBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UpdateBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	paymentMethodID, reqErr := requestutils.GetURLParamString(r, types.URLParamDatastoreName)
	if reqErr != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error updating payment method: %w", fmt.Errorf("invalid id parameter"))))
		return
	}

	err := c.Config().BillingManager.UpdatePaymentMethod(paymentMethodID)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating setup intent: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}
