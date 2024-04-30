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

// ListCreditsHandler is a handler for getting available credits
type ListCreditsHandler struct {
	handlers.PorterHandlerWriter
}

// NewListCreditsHandler will create a new ListCreditsHandler
func NewListCreditsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListCreditsHandler {
	return &ListCreditsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListCreditsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-credits")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		)
		return
	}

	credits, err := c.Config().BillingManager.MetronomeClient.ListCustomerCredits(ctx, proj.UsageID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing credits")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	c.WriteResult(w, r, credits)
}
