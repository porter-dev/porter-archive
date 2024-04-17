package billing

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
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
	ctx, span := telemetry.NewSpan(r.Context(), "serve-get-publishable-key")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

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
