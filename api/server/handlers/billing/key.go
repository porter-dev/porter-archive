package billing

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// GetPublishableKeyHandler will return the configured publishable key
type GetPublishableKeyHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetPublishableKeyHandler will return the publishable key
func NewGetPublishableKeyHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetPublishableKeyHandler {
	return &GetPublishableKeyHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetPublishableKeyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "get-publishable-key-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := ctx.Value(types.UserScope).(*models.User)

	// Create billing customer for project and set the billing ID if it doesn't exist
	if proj.BillingID == "" {
		billingID, err := c.Config().BillingManager.StripeClient.CreateCustomer(ctx, user.Email, proj.ID, proj.Name)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating billing customer")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		proj.BillingID = billingID

		_, err = c.Repo().Project().UpdateProject(proj)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error updating project")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	// There is no easy way to pass environment variables to the frontend,
	// so for now pass via the backend. This is acceptable because the key is
	// meant to be public
	publishableKey := c.Config().BillingManager.StripeClient.GetPublishableKey(ctx)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
	)

	c.WriteResult(w, r, publishableKey)
}
