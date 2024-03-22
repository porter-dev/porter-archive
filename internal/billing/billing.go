package billing

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// BillingManager contains methods for managing billing for a project
type BillingManager interface {
	// CreateCustomer registers a project in the billing provider. This is currently a one-to-one
	// mapping with projects and billing customers, because billing and usage are set per project.
	CreateCustomer(userEmail string, proj *models.Project) (customerID string, err error)

	// DeleteCustomer will delete the customer from the billing provider
	DeleteCustomer(proj *models.Project) (err error)

	// CheckPaymentEnabled will check if the project has a payment method configured
	CheckPaymentEnabled(proj *models.Project) (paymentEnabled bool, err error)

	// ListPaymentMethod will return all payment methods for the project
	ListPaymentMethod(proj *models.Project) (paymentMethods []types.PaymentMethod, err error)

	// CreatePaymentMethod will add a new payment method to the project in Stripe
	CreatePaymentMethod(proj *models.Project) (clientSecret string, err error)

	// DeletePaymentMethod will remove a payment method for the project in Stripe
	DeletePaymentMethod(paymentMethodID string) (err error)
}

// NoopBillingManager performs no billing operations
type NoopBillingManager struct{}

// CreateCustomer is a no-op
func (s *NoopBillingManager) CreateCustomer(userEmail string, proj *models.Project) (customerID string, err error) {
	return "", nil
}

func (s *NoopBillingManager) DeleteCustomer(proj *models.Project) (err error) {
	return nil
}

func (s *NoopBillingManager) CheckPaymentEnabled(proj *models.Project) (paymentEnabled bool, err error) {
	return false, nil
}

// ListPaymentMethod is a no-op
func (s *NoopBillingManager) ListPaymentMethod(proj *models.Project) (paymentMethods []types.PaymentMethod, err error) {
	return []types.PaymentMethod{}, nil
}

// CreatePaymentMethod is a no-op
func (s *NoopBillingManager) CreatePaymentMethod(proj *models.Project) (clientSecret string, err error) {
	return "", nil
}

// DeletePaymentMethod is a no-op
func (s *NoopBillingManager) DeletePaymentMethod(paymentMethodID string) (err error) {
	return nil
}
