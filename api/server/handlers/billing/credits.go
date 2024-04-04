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

// GetCreditsHandler is a handler for getting available credits
type GetCreditsHandler struct {
	handlers.PorterHandlerWriter
}

// NewGetCreditsHandler will create a new GetCreditsHandler
func NewGetCreditsHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *GetCreditsHandler {
	return &GetCreditsHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *GetCreditsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "get-credits-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	credits, err := c.Config().BillingManager.MetronomeClient.GetCustomerCredits(proj.UsageID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting credits")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, credits)
}
