package billing

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/setupintent"
)

// StripeBillingManager interacts with the Stripe API to manage payment methods
// and customers
type StripeBillingManager struct {
	StripeSecretKey string
}

// CreateCustomer will create a customer in Stripe only if the project doesn't have a BillingID
func (s *StripeBillingManager) CreateCustomer(userEmail string, proj *models.Project) (customerID string, err error) {
	stripe.Key = s.StripeSecretKey

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
			return "", err
		}

		customerID = customer.ID
	}

	return customerID, nil
}

// DeleteCustomer will delete the customer from the billing provider
func (s *StripeBillingManager) DeleteCustomer(proj *models.Project) (err error) {
	stripe.Key = s.StripeSecretKey

	if proj.BillingID != "" {
		params := &stripe.CustomerParams{}
		_, err := customer.Del(proj.BillingID, params)
		if err != nil {
			return err
		}
	}

	return nil
}

// CheckPaymentEnabled will return true if the project has a payment method added, false otherwise
func (s *StripeBillingManager) CheckPaymentEnabled(proj *models.Project) (paymentEnabled bool, err error) {
	stripe.Key = s.StripeSecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	return result.Next(), nil
}

// ListPaymentMethod will return all payment methods for the project
func (s *StripeBillingManager) ListPaymentMethod(proj *models.Project) (paymentMethods []types.PaymentMethod, err error) {
	stripe.Key = s.StripeSecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	for result.Next() {
		stripePaymentMethod := result.PaymentMethod()

		paymentMethods = append(paymentMethods, types.PaymentMethod{
			ID:           stripePaymentMethod.ID,
			DisplayBrand: stripePaymentMethod.Card.DisplayBrand,
			Last4:        stripePaymentMethod.Card.Last4,
			ExpMonth:     stripePaymentMethod.Card.ExpMonth,
			ExpYear:      stripePaymentMethod.Card.ExpYear,
		})
	}

	return paymentMethods, nil
}

// CreatePaymentMethod will add a new payment method to the project in Stripe
func (s *StripeBillingManager) CreatePaymentMethod(proj *models.Project) (clientSecret string, err error) {
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
		return "", err
	}

	return intent.ClientSecret, nil
}

// DeletePaymentMethod will remove a payment method for the project in Stripe
func (s *StripeBillingManager) DeletePaymentMethod(paymentMethodID string) (err error) {
	stripe.Key = s.StripeSecretKey

	_, err = paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		return err
	}

	return nil
}
