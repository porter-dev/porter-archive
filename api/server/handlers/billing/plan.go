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

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
			telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
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

// ListCustomerUsageHandler returns customer usage aggregations like CPU and RAM hours.
type ListCustomerUsageHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListCustomerUsageHandler returns a new ListCustomerUsageHandler
func NewListCustomerUsageHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListCustomerUsageHandler {
	return &ListCustomerUsageHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListCustomerUsageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-customer-usage")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
		telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	req := &types.ListCustomerUsageRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding list customer usage request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	usage, err := c.Config().BillingManager.MetronomeClient.ListCustomerUsage(ctx, proj.UsageID, req.StartingOn, req.EndingBefore, req.WindowSize, req.CurrentPeriod)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing customer usage")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	c.WriteResult(w, r, usage)
}

// ListCustomerCostsHandler returns customer usage aggregations like CPU and RAM hours.
type ListCustomerCostsHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewListCustomerCostsHandler returns a new ListCustomerCostsHandler
func NewListCustomerCostsHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *ListCustomerCostsHandler {
	return &ListCustomerCostsHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *ListCustomerCostsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-customer-costs")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "metronome-config-exists", Value: c.Config().BillingManager.MetronomeConfigLoaded},
		telemetry.AttributeKV{Key: "metronome-enabled", Value: proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient)},
		telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
	)

	if !c.Config().BillingManager.MetronomeConfigLoaded || !proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	req := &types.ListCustomerCostsRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding list customer costs request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	usage, err := c.Config().BillingManager.MetronomeClient.ListCustomerCosts(ctx, proj.UsageID, req.StartingOn, req.EndingBefore, req.Limit)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing customer costs")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	c.WriteResult(w, r, usage)
}
