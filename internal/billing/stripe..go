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

// ListPaymentMethod will return all payment methods for the project
func (s *StripeBillingManager) ListPaymentMethod(proj *models.Project) (paymentMethods []types.PaymentMethod, err error) {
	stripe.Key = s.StripeSecretKey

	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(proj.BillingID),
		Type:     stripe.String(string(stripe.PaymentMethodTypeCard)),
	}
	result := paymentmethod.List(params)

	for result.Next() {
		paymentMethods = append(paymentMethods, result.PaymentMethod())
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

// TODO: remove these methods when the billing tech-debt is cleaned
// CreateTeam
func (s *StripeBillingManager) CreateTeam(user *models.User, proj *models.Project) (teamID string, err error) {
	return fmt.Sprintf("%d", proj.ID), nil
}

// TODO: remove these methods when the billing tech-debt is cleaned
// DeleteTeam
func (s *StripeBillingManager) DeleteTeam(user *models.User, proj *models.Project) (err error) {
	return nil
}

// TODO: remove these methods when the billing tech-debt is cleaned
// GetRedirectURI
func (s *StripeBillingManager) GetRedirectURI(user *models.User, proj *models.Project) (url string, err error) {
	return "", nil
}

// TODO: remove these methods when the billing tech-debt is cleaned
// ParseProjectUsageFromWebhook
func (s *StripeBillingManager) ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, *types.FeatureFlags, error) {
	return nil, nil, nil
}

// TODO: remove these methods when the billing tech-debt is cleaned
// VerifySignature
func (s *StripeBillingManager) VerifySignature(signature string, body []byte) bool {
	return false
}
