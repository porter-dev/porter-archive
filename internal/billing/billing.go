package billing

import (
	"fmt"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// BillingManager contains methods for managing billing for a project
type BillingManager interface {
	CreateTeam(user *models.User, proj *models.Project) (teamID string, err error) 
	DeleteTeam(user *models.User, proj *models.Project) (err error) 

	// CreateCustomer registers a project in the billing provider. This is currently a one-to-one
	// mapping with projects and billing customers, because billing and usage are set per project.
	// CreateCustomer(userEmail string, proj *models.Project) (err error)
	// ListPaymentMethod(proj *models.Project) (err error)
	// CreatePaymentMethod(proj *models.Project) (err error)
	// UpdatePaymentMethod(paymentMethodID string, proj *models.Project) (err error)
	// DeletePaymentMethod(paymentMethodID string, proj *models.Project) (err error)

	// GetRedirectURI gets the redirect URI to send the user to the billing portal
	GetRedirectURI(user *models.User, proj *models.Project) (url string, err error)

	// ParseProjectUsageFromWebhook parses the project usage from a webhook payload sent
	// from a billing agent
	ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, *types.FeatureFlags, error)

	// VerifySignature verifies the signature for a webhook
	VerifySignature(signature string, body []byte) bool
}

// NoopBillingManager performs no billing operations
type NoopBillingManager struct{}

func (n *NoopBillingManager) CreateTeam(user *models.User, proj *models.Project) (teamID string, err error) {
	return fmt.Sprintf("%d", proj.ID), nil
}

func (n *NoopBillingManager) DeleteTeam(user *models.User, proj *models.Project) (err error) {
	return nil
}

func (n *NoopBillingManager) GetRedirectURI(user *models.User, proj *models.Project) (url string, err error) {
	return "", nil
}

func (n *NoopBillingManager) ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, *types.FeatureFlags, error) {
	return nil, nil, nil
}

func (n *NoopBillingManager) VerifySignature(signature string, body []byte) bool {
	return false
}
