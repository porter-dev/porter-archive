package billing

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

// ListBillingHandler is a handler for listing payment methods
type ListBillingHandler struct {
	handlers.PorterHandlerWriter
}

// CheckPaymentEnabledHandler is a handler for checking if payment is setup
type CheckPaymentEnabledHandler struct {
	handlers.PorterHandlerWriter
}

// NewListBillingHandler will create a new ListBillingHandler
func NewListBillingHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *ListBillingHandler {
	return &ListBillingHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *ListBillingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-list-payment-methods")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	paymentMethods, err := c.Config().BillingManager.StripeClient.ListPaymentMethod(ctx, proj.BillingID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error listing payment method")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error listing payment method: %w", err)))
		return
	}

	c.WriteResult(w, r, paymentMethods)
}

// NewCheckPaymentEnabledHandler will create a new CheckPaymentEnabledHandler
func NewCheckPaymentEnabledHandler(
	config *config.Config,
	writer shared.ResultWriter,
) *CheckPaymentEnabledHandler {
	return &CheckPaymentEnabledHandler{
		PorterHandlerWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *CheckPaymentEnabledHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "serve-check-payment-enabled")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)

	// Get project roles
	roles, err := c.Repo().Project().ListProjectRolesOrdered(proj.ID)
	if err != nil {
		err = telemetry.Error(ctx, span, err, "error listing project roles")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	// Get the project admin user
	var adminUser *models.User
	for _, role := range roles {
		if role.Kind == types.RoleAdmin {
			adminUser, err = c.Repo().User().ReadUser(role.UserID)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error reading user")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
			break
		}
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "admin-user-id", Value: adminUser.ID},
		telemetry.AttributeKV{Key: "admin-user-email", Value: adminUser.Email},
	)

	// Create billing customer for project and set the billing ID if it doesn't exist
	var shouldUpdate bool
	if proj.BillingID == "" {
		billingID, err := c.Config().BillingManager.StripeClient.CreateCustomer(ctx, adminUser.Email, proj.ID, proj.Name)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating billing customer")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		proj.BillingID = billingID
		shouldUpdate = true

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "billing-id", Value: proj.BillingID},
		)
	}

	if c.Config().BillingManager.MetronomeEnabled && proj.GetFeatureFlag(models.MetronomeEnabled, c.Config().LaunchDarklyClient) && proj.UsageID == uuid.Nil {
		customerID, customerPlanID, err := c.Config().BillingManager.MetronomeClient.CreateCustomerWithPlan(ctx, adminUser.Email, proj.Name, proj.ID, proj.BillingID, proj.EnableSandbox)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error creating Metronome customer")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		}
		proj.UsageID = customerID
		proj.UsagePlanID = customerPlanID
		shouldUpdate = true

		telemetry.WithAttributes(span,
			telemetry.AttributeKV{Key: "usage-id", Value: proj.UsageID},
			telemetry.AttributeKV{Key: "usage-plan-id", Value: proj.UsagePlanID},
		)
	}

	if shouldUpdate {
		_, err := c.Repo().Project().UpdateProject(proj)
		if err != nil {
			err := telemetry.Error(ctx, span, err, "error updating project")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
	}

	paymentEnabled, err := c.Config().BillingManager.StripeClient.CheckPaymentEnabled(ctx, proj.BillingID)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error checking if payment enabled")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error checking if payment enabled: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
	)

	c.WriteResult(w, r, paymentEnabled)
}
