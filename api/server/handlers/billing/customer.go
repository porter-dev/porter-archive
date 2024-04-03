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

// CreateBillingCustomerHandler will create a new handler
// for creating customers in the billing provider
type CreateBillingCustomerHandler struct {
	handlers.PorterHandlerReadWriter
}

// NewCreateBillingCustomerIfNotExists will create a new CreateBillingCustomerIfNotExists
func NewCreateBillingCustomerIfNotExists(
	config *config.Config,
	writer shared.ResultWriter,
) *CreateBillingCustomerHandler {
	return &CreateBillingCustomerHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, nil, writer),
	}
}

func (c *CreateBillingCustomerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, span := telemetry.NewSpan(r.Context(), "create-billing-customer-endpoint")
	defer span.End()

	proj, _ := ctx.Value(types.ProjectScope).(*models.Project)
	user, _ := r.Context().Value(types.UserScope).(*models.User)

	if proj.BillingID != "" {
		c.WriteResult(w, r, "")
		return
	}

	// Create customer in Stripe
	customerID, err := c.Config().BillingManager.StripeClient.CreateCustomer(ctx, user.Email, proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error creating billing customer")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error creating billing customer: %w", err)))
		return
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: proj.ID},
		telemetry.AttributeKV{Key: "customer-id", Value: proj.BillingID},
		telemetry.AttributeKV{Key: "user-email", Value: user.Email},
	)

	// Create Metronome customer and add to starter plan
	if c.Config().ServerConf.MetronomeAPIKey != "" && c.Config().ServerConf.PorterCloudPlanID != "" &&
		c.Config().ServerConf.EnableSandbox {
		// Create Metronome Customer
		if c.Config().ServerConf.MetronomeAPIKey != "" {
			usageID, err := c.Config().BillingManager.MetronomeClient.CreateCustomer(user.CompanyName, proj.Name, proj.ID, proj.BillingID)
			if err != nil {
				err = telemetry.Error(ctx, span, err, "error creating billing customer")
				c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
				return
			}
			proj.UsageID = usageID
		}

		porterCloudPlanID, err := uuid.Parse(c.Config().ServerConf.PorterCloudPlanID)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error parsing starter plan id")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}

		// Add to starter plan
		customerPlanID, err := c.Config().BillingManager.MetronomeClient.AddCustomerPlan(proj.UsageID, porterCloudPlanID)
		if err != nil {
			err = telemetry.Error(ctx, span, err, "error adding customer to starter plan")
			c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
			return
		}
		proj.UsagePlanID = customerPlanID
	}

	// Update the project record with the customer ID
	proj.BillingID = customerID
	_, err = c.Repo().Project().UpdateProject(proj)
	if err != nil {
		err := telemetry.Error(ctx, span, err, "error updating project")
		c.HandleAPIError(w, r, apierrors.NewErrInternal(fmt.Errorf("error updating project: %w", err)))
		return
	}

	c.WriteResult(w, r, "")
}

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
