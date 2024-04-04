package billing

import (
	"context"
	"fmt"
	"strconv"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/telemetry"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/setupintent"
)

// StripeClient interacts with the Stripe API to manage payment methods
// and customers
type StripeClient struct {
	SecretKey      string
	PublishableKey string
}

// NewStripeClient creates a new client to call the Stripe API
func NewStripeClient(secretKey string, publishableKey string) StripeClient {
	return StripeClient{
		SecretKey:      secretKey,
		PublishableKey: publishableKey,
	}
}

// CreateCustomer will create a customer in Stripe only if the project doesn't have a BillingID
func (s StripeClient) CreateCustomer(ctx context.Context, userEmail string, projectID uint, projectName string) (customerID string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-stripe-customer")
	defer span.End()

	if projectID == 0 || projectName == "" {
		return "", fmt.Errorf("invalid project id or name")
	}

	stripe.Key = s.SecretKey

	// Create customer if not exists
	customerName := fmt.Sprintf("project_%s", projectName)
	projectIDStr := strconv.FormatUint(uint64(projectID), 10)
	params := &stripe.CustomerParams{
		Name:  stripe.String(customerName),
		Email: stripe.String(userEmail),
		Metadata: map[string]string{
			"porter_project_id": projectIDStr,
		},
	}

	// Create in Stripe
	customer, err := customer.New(params)
	if err != nil {
		return "", telemetry.Error(ctx, span, err, "failed to create Stripe customer")
	}

	customerID = customer.ID

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectIDStr},
		telemetry.AttributeKV{Key: "customer-id", Value: customerID},
		telemetry.AttributeKV{Key: "user-email", Value: userEmail},
	)

	return customerID, nil
}

// DeleteCustomer will delete the customer from the billing provider
func (s StripeClient) DeleteCustomer(ctx context.Context, customerID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "delete-stripe-customer")
	defer span.End()

	if customerID == "" {
		return nil
	}

	stripe.Key = s.SecretKey

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "billing-id", Value: customerID},
	)

	params := &stripe.CustomerParams{}
	_, err = customer.Del(customerID, params)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to delete Stripe customer")
	}

	return nil
}

// CheckPaymentEnabled will return true if the project has a payment method added, false otherwise
func (s StripeClient) CheckPaymentEnabled(ctx context.Context, customerID string) (paymentEnabled bool, err error) {
	_, span := telemetry.NewSpan(ctx, "check-stripe-payment-enabled")
	defer span.End()

	if customerID == "" {
		return false, fmt.Errorf("customer id cannot be empty")
	}

	stripe.Key = s.SecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(customerID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	return result.Next(), nil
}

// ListPaymentMethod will return all payment methods for the project
func (s StripeClient) ListPaymentMethod(ctx context.Context, customerID string) (paymentMethods []types.PaymentMethod, err error) {
	ctx, span := telemetry.NewSpan(ctx, "list-stripe-payment-method")
	defer span.End()

	if customerID == "" {
		return paymentMethods, fmt.Errorf("customer id cannot be empty")
	}

	stripe.Key = s.SecretKey

	// Get configured payment methods
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(customerID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	defaultPaymentExists, defaultPaymentID, err := s.checkDefaultPaymentMethod(customerID)
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
		err = s.SetDefaultPaymentMethod(ctx, paymentMethods[len(paymentMethods)-1].ID, customerID)
		if err != nil {
			return paymentMethods, telemetry.Error(ctx, span, err, "failed to list Stripe payment method")
		}
	}

	return paymentMethods, nil
}

// CreatePaymentMethod will add a new payment method to the project in Stripe
func (s StripeClient) CreatePaymentMethod(ctx context.Context, customerID string) (clientSecret string, err error) {
	ctx, span := telemetry.NewSpan(ctx, "create-stripe-payment-method")
	defer span.End()

	if customerID == "" {
		return "", fmt.Errorf("customer id cannot be empty")
	}

	stripe.Key = s.SecretKey

	params := &stripe.SetupIntentParams{
		Customer: stripe.String(customerID),
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
func (s StripeClient) SetDefaultPaymentMethod(ctx context.Context, paymentMethodID string, customerID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "set-default-stripe-payment-method")
	defer span.End()

	if customerID == "" || paymentMethodID == "" {
		return fmt.Errorf("empty customer id or payment method id")
	}

	stripe.Key = s.SecretKey

	params := &stripe.CustomerParams{
		InvoiceSettings: &stripe.CustomerInvoiceSettingsParams{
			DefaultPaymentMethod: stripe.String(paymentMethodID),
		},
	}

	_, err = customer.Update(customerID, params)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to set default Stripe payment method")
	}

	return nil
}

// DeletePaymentMethod will remove a payment method for the project in Stripe
func (s StripeClient) DeletePaymentMethod(ctx context.Context, paymentMethodID string) (err error) {
	ctx, span := telemetry.NewSpan(ctx, "delete-stripe-payment-method")
	defer span.End()

	if paymentMethodID == "" {
		return fmt.Errorf("payment method id cannot be empty")
	}

	stripe.Key = s.SecretKey

	_, err = paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to delete Stripe payment method")
	}

	return nil
}

// GetPublishableKey returns the Stripe publishable key
func (s StripeClient) GetPublishableKey(ctx context.Context) (key string) {
	_, span := telemetry.NewSpan(ctx, "get-stripe-publishable-key")
	defer span.End()

	return s.PublishableKey
}

func (s StripeClient) checkDefaultPaymentMethod(customerID string) (defaultPaymentExists bool, defaultPaymentID string, err error) {
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
