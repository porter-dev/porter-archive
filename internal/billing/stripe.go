package billing

import (
	"context"
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/setupintent"
)

// StripeBillingManager interacts with the Stripe API to manage payment methods
// and customers
type StripeBillingManager struct {
	StripeSecretKey      string
	StripePublishableKey string
}

// CreateCustomer will create a customer in Stripe only if the project doesn't have a BillingID
func (s *StripeBillingManager) CreateCustomer(ctx context.Context, userEmail string, proj *models.Project) (customerID string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-stripe-customer")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "billing-id", Value: proj.BillingID},
	)

	if proj.BillingID == "" {
		// Create customer if not exists
		customerName := fmt.Sprintf("project_%s", proj.Name)
		params := &stripe.CustomerParams{
			Name:  stripe.String(customerName),
			Email: stripe.String(userEmail),
		}

		// Create in Stripe
		customer, err := customer.New(params)
		if err != nil {
			return "", telemetry.Error(ctx, span, err, "failed to create Stripe customer")
		}

		customerID = customer.ID
	}

	return customerID, nil
}

// DeleteCustomer will delete the customer from the billing provider
func (s *StripeBillingManager) DeleteCustomer(ctx context.Context, proj *models.Project) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "delete-stripe-customer")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "billing-id", Value: proj.BillingID},
	)

	if proj.BillingID != "" {
		params := &stripe.CustomerParams{}
		_, err := customer.Del(proj.BillingID, params)
		if err != nil {
			return telemetry.Error(ctx, span, err, "failed to delete Stripe customer")
		}
	}

	return nil
}

// CheckPaymentEnabled will return true if the project has a payment method added, false otherwise
func (s *StripeBillingManager) CheckPaymentEnabled(ctx context.Context, proj *models.Project) (paymentEnabled bool, err error) {
	_, span := telemetry.NewSpan(ctx, "check-stripe-payment-enabled")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	return result.Next(), nil
}

// ListPaymentMethod will return all payment methods for the project
func (s *StripeBillingManager) ListPaymentMethod(ctx context.Context, proj *models.Project) (paymentMethods []types.PaymentMethod, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-stripe-payment-method")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	// Get configured payment methods
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	defaultPaymentExists, defaultPaymentID, err := s.checkDefaultPaymentMethod(proj.BillingID)
	if err != nil {
		return paymentMethods, telemetry.Error(ctx, span, err, "failed to list Stripe payment method")
	}

	for result.Next() {
		stripePaymentMethod := result.PaymentMethod()

		var isDefaultPaymentMethod bool
		if stripePaymentMethod.ID == defaultPaymentID {
			isDefaultPaymentMethod = true
		}

		paymentMethods = append(paymentMethods, types.PaymentMethod{
			ID:           stripePaymentMethod.ID,
			DisplayBrand: stripePaymentMethod.Card.DisplayBrand,
			Last4:        stripePaymentMethod.Card.Last4,
			ExpMonth:     stripePaymentMethod.Card.ExpMonth,
			ExpYear:      stripePaymentMethod.Card.ExpYear,
			Default:      isDefaultPaymentMethod,
		})
	}

	// Set default payment method when project has payment methods enabled but
	// no default setup
	if len(paymentMethods) > 0 && !defaultPaymentExists {
		err = s.SetDefaultPaymentMethod(ctx, paymentMethods[len(paymentMethods)-1].ID, proj)
		if err != nil {
			return paymentMethods, telemetry.Error(ctx, span, err, "failed to list Stripe payment method")
		}
	}

	return paymentMethods, nil
}

// CreatePaymentMethod will add a new payment method to the project in Stripe
func (s *StripeBillingManager) CreatePaymentMethod(ctx context.Context, proj *models.Project) (clientSecret string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-stripe-payment-method")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	params := &stripe.SetupIntentParams{
		Customer: stripe.String(proj.BillingID),
		AutomaticPaymentMethods: &stripe.SetupIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(false),
		},
		PaymentMethodTypes: []*string{stripe.String("card")},
	}

	intent, err := setupintent.New(params)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "failed to create Stripe payment method")
	}

	return intent.ClientSecret, nil
}

// SetDefaultPaymentMethod will add a new payment method to the project in Stripe
func (s *StripeBillingManager) SetDefaultPaymentMethod(ctx context.Context, paymentMethodID string, proj *models.Project) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "set-default-stripe-payment-method")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	params := &stripe.CustomerParams{
		InvoiceSettings: &stripe.CustomerInvoiceSettingsParams{
			DefaultPaymentMethod: stripe.String(paymentMethodID),
		},
	}

	_, err = customer.Update(proj.BillingID, params)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to set default Stripe payment method")
	}

	return nil
}

// DeletePaymentMethod will remove a payment method for the project in Stripe
func (s *StripeBillingManager) DeletePaymentMethod(ctx context.Context, paymentMethodID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "delete-stripe-payment-method")
	defer span.End()

	stripe.Key = s.StripeSecretKey

	_, err = paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to delete Stripe payment method")
	}

	return nil
}

// GetPublishableKey returns the Stripe publishable key
func (s *StripeBillingManager) GetPublishableKey(ctx context.Context) (key string) {
	_, span := telemetry.NewSpan(ctx, "get-stripe-publishable-key")
	defer span.End()

	return s.StripePublishableKey
}

func (s *StripeBillingManager) checkDefaultPaymentMethod(customerID string) (defaultPaymentExists bool, defaultPaymentID string, err error) {
	// Get customer to check default payment method
	customer, err := customer.Get(customerID, nil)
	if err != nil {
		return defaultPaymentExists, defaultPaymentID, err
	}

	if customer.InvoiceSettings != nil && customer.InvoiceSettings.DefaultPaymentMethod != nil {
		defaultPaymentExists = true
		defaultPaymentID = customer.InvoiceSettings.DefaultPaymentMethod.ID
	}

	return defaultPaymentExists, defaultPaymentID, err
}
