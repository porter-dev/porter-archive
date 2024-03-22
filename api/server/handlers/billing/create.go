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

// CreateBillingHandler is a handler for creating payment methods
type CreateBillingHandler struct {
	handlers.PorterHandlerWriter
}

// NewCreateBillingHandler will create a new CreateBillingHandler
func NewCreateBillingHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateBillingHandler {
	return &CreateBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *CreateBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "create-billing-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	clientSecret, err := c.Config().BillingManager.CreatePaymentMethod(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, clientSecret)
}
