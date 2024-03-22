package billing

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// BillingManager contains methods for managing billing for a project
type BillingManager interface {
	// CreateTeam creates the concept of a billing "team". This is currently a one-to-one
	// mapping with projects, but this may change in the future (i.e. multiple projects
	// per same team)
	CreateTeam(user *models.User, proj *models.Project) (teamID string, err error)

	// DeleteTeam deletes a billing team.
	DeleteTeam(user *models.User, proj *models.Project) (err error)

	// CreateCustomer registers a project in the billing provider. This is currently a one-to-one
	// mapping with projects and billing customers, because billing and usage are set per project.
	CreateCustomer(userEmail string, proj *models.Project) (customerID string, err error)

	// ListPaymentMethod will return all payment methods for the project
	ListPaymentMethod(proj *models.Project) (paymentMethods []types.PaymentMethod, err error)

	// CreatePaymentMethod will add a new payment method to the project in Stripe
	CreatePaymentMethod(proj *models.Project) (clientSecret string, err error)

	// DeletePaymentMethod will remove a payment method for the project in Stripe
	DeletePaymentMethod(paymentMethodID string) (err error)

	// GetRedirectURI gets the redirect URI to send the user to the billing portal
	GetRedirectURI(user *models.User, proj *models.Project) (url string, err error)

	// ParseProjectUsageFromWebhook parses the project usage from a webhook payload sent
	// from a billing agent
	ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, error)

	// VerifySignature verifies the signature for a webhook
	VerifySignature(signature string, body []byte) bool
}

// NoopBillingManager performs no billing operations
type NoopBillingManager struct{}

// CreateCustomer is a no-op
func (s *NoopBillingManager) CreateCustomer(userEmail string, proj *models.Project) (customerID string, err error) {
	return "", nil
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

// CreateTeam is a no-op
func (n *NoopBillingManager) CreateTeam(user *models.User, proj *models.Project) (teamID string, err error) {
	return fmt.Sprintf("%d", proj.ID), nil
}

// DeleteTeam is a no-op
func (n *NoopBillingManager) DeleteTeam(user *models.User, proj *models.Project) (err error) {
	return nil
}

// GetRedirectURI is a no-op
func (n *NoopBillingManager) GetRedirectURI(user *models.User, proj *models.Project) (url string, err error) {
	return "", nil
}

// ParseProjectUsageFromWebhook is a no-op
func (n *NoopBillingManager) ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, error) {
	return nil, nil
}

// VerifySignature is a no-op
func (n *NoopBillingManager) VerifySignature(signature string, body []byte) bool {
	return false
}
