package billing

<<<<<<< HEAD
import (
	"context"

	"github.com/porter-dev/porter/api/types"
)

// BillingManager contains methods for managing billing for a project
type BillingManager interface {
	// CreateCustomer registers a project in the billing provider. This is currently a one-to-one
	// mapping with projects and billing customers, because billing and usage are set per project.
	CreateCustomer(ctx context.Context, userEmail string, projectID uint, projectName string) (customerID string, err error)

	// DeleteCustomer will delete the customer from the billing provider
	DeleteCustomer(ctx context.Context, customerID string) (err error)

	// CheckPaymentEnabled will check if the project has a payment method configured
	CheckPaymentEnabled(ctx context.Context, customerID string) (paymentEnabled bool, err error)

	// ListPaymentMethod will return all payment methods for the project
	ListPaymentMethod(ctx context.Context, customerID string) (paymentMethods []types.PaymentMethod, err error)

	// CreatePaymentMethod will add a new payment method to the project in Stripe
	CreatePaymentMethod(ctx context.Context, customerID string) (clientSecret string, err error)

	// SetDefaultPaymentMethod will set the payment method as default in the customer invoice settings
	SetDefaultPaymentMethod(ctx context.Context, paymentMethodID string, customerID string) (err error)

	// DeletePaymentMethod will remove a payment method for the project in Stripe
	DeletePaymentMethod(ctx context.Context, paymentMethodID string) (err error)

	// GetPublishableKey returns the key used to render frontend components for the billing manager
	GetPublishableKey(ctx context.Context) (key string)
}

// NoopBillingManager performs no billing operations
type NoopBillingManager struct{}

// CreateCustomer is a no-op
func (s *NoopBillingManager) CreateCustomer(ctx context.Context, userEmail string, projectID uint, projectName string) (customerID string, err error) {
	return "", nil
}

// DeleteCustomer is a no-op
func (s *NoopBillingManager) DeleteCustomer(ctx context.Context, customerID string) (err error) {
	return nil
}

// CheckPaymentEnabled is a  no-op
func (s *NoopBillingManager) CheckPaymentEnabled(ctx context.Context, customerID string) (paymentEnabled bool, err error) {
	return false, nil
}

// ListPaymentMethod is a no-op
func (s *NoopBillingManager) ListPaymentMethod(ctx context.Context, customerID string) (paymentMethods []types.PaymentMethod, err error) {
	return []types.PaymentMethod{}, nil
}

// CreatePaymentMethod is a no-op
func (s *NoopBillingManager) CreatePaymentMethod(ctx context.Context, customerID string) (clientSecret string, err error) {
	return "", nil
}

// SetDefaultPaymentMethod is a no-op
func (s *NoopBillingManager) SetDefaultPaymentMethod(ctx context.Context, paymentMethodID string, customerID string) (err error) {
	return nil
}

// DeletePaymentMethod is a no-op
func (s *NoopBillingManager) DeletePaymentMethod(ctx context.Context, paymentMethodID string) (err error) {
	return nil
}

// GetPublishableKey is a no-op
func (s *NoopBillingManager) GetPublishableKey(ctx context.Context) (key string) {
	return ""
=======
// BillingManager contains methods for managing billing for a project
type BillingManager struct {
	StripeClient    *StripeClient
	MetronomeClient *MetronomeClient
>>>>>>> b8c4273a5 (Add Metronome business logic)
}
