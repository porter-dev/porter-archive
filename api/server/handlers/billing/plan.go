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

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "lago-config-exists", Value: c.Config().BillingManager.LagoConfigLoaded},
		telemetry.AttributeKV{Key: "lago-enabled", Value: proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient)},
	)

	if !c.Config().BillingManager.LagoConfigLoaded || !proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	plan, err := c.Config().BillingManager.LagoClient.GetCustomeActivePlan(ctx, proj.ID, proj.EnableSandbox)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting active subscription")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "subscription_id", Value: plan.ID},
	)

	endingBefore, err := c.Config().BillingManager.LagoClient.CheckCustomerCouponExpiration(ctx, proj.ID, proj.EnableSandbox)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing active coupons")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// If the customer has a coupon, use its end date instead of the trial end date
	if endingBefore != "" {
		plan.TrialInfo.EndingBefore = endingBefore
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "trial-ending-at", Value: plan.TrialInfo.EndingBefore},
	)

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

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "lago-config-exists", Value: c.Config().BillingManager.LagoConfigLoaded},
		telemetry.AttributeKV{Key: "lago-enabled", Value: proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient)},
	)

	if !c.Config().BillingManager.LagoConfigLoaded || !proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	credits, err := c.Config().BillingManager.LagoClient.ListCustomerCredits(ctx, proj.ID, proj.EnableSandbox)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing credits")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

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
		telemetry.AttributeKV{Key: "lago-config-exists", Value: c.Config().BillingManager.LagoConfigLoaded},
		telemetry.AttributeKV{Key: "lago-enabled", Value: proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient)},
	)

	if !c.Config().BillingManager.LagoConfigLoaded || !proj.GetFeatureFlag(models.LagoEnabled, c.Config().LaunchDarklyClient) {
		c.WriteResult(w, r, "")
		return
	}

	req := &types.ListCustomerUsageRequest{}

	if ok := c.DecodeAndValidate(w, r, req); !ok {
		err := telemetry.Error(ctx, span, nil, "error decoding list customer usage request")
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(err, http.StatusBadRequest))
		return
	}

	plan, err := c.Config().BillingManager.LagoClient.GetCustomeActivePlan(ctx, proj.ID, proj.EnableSandbox)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error getting active subscription")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "subscription_id", Value: plan.ID},
	)

	usage, err := c.Config().BillingManager.LagoClient.ListCustomerUsage(ctx, plan.CustomerID, plan.ID, req.CurrentPeriod, req.PreviousPeriods)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing customer usage")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}
	c.WriteResult(w, r, usage)
}
