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

// ListPlansHandler is a handler for getting customer plans
type ListPlansHandler struct {
	handlers.PorterHandlerWriter
}

// NewListPlansHandler will create a new ListPlansHandler
func NewListPlansHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListPlansHandler {
	return &ListPlansHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListPlansHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-plans")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.MetronomeEnabled || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-enabled", Value: false},
		)
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	plan, err := c.Config().BillingManager.MetronomeClient.ListCustomerPlan(ctx, proj.UsageID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing plans")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, plan)
}

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

	if !c.Config().BillingManager.MetronomeEnabled || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-enabled", Value: false},
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

// GetUsageDashboardHandler returns an embeddable dashboard to display information related to customer usage.
type GetUsageDashboardHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewGetUsageDashboardHandler returns a new GetUsageDashboardHandler
func NewGetUsageDashboardHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *GetUsageDashboardHandler {
	return &GetUsageDashboardHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *GetUsageDashboardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-usage-dashboard")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	if !c.Config().BillingManager.MetronomeEnabled || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-enabled", Value: false},
		)
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-enabled", Value: true},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	request := &types.EmbeddableDashboardRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding embeddable usage dashboard request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	credits, err := c.Config().BillingManager.MetronomeClient.GetCustomerDashboard(ctx, proj.UsageID, request.DashboardType, request.Options, request.ColorOverrides)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting customer dashboard")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	c.WriteResult(w, r, credits)
}
