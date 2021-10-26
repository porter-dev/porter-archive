package billing

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
)

// BillingManager contains methods for managing billing for a project
type BillingManager interface {
	// CreateTeam creates the concept of a billing "team". This is currently a one-to-one
	// mapping with projects, but this may change in the future (i.e. multiple projects
	// per same team)
	CreateTeam(proj *models.Project) (teamID string, err error)

	// DeleteTeam deletes a billing team.
	DeleteTeam(proj *models.Project) (err error)

	// GetTeamID gets the billing team id for a project
	GetTeamID(proj *models.Project) (teamID string, err error)

	// AddUserToTeam adds a user to a team, and cases on whether the user can view
	// billing based on the role.
	AddUserToTeam(teamID string, user *models.User, role *models.Role) error

	// UpdateUserInTeam updates a user's role in a team, and cases on whether the user can view
	// billing based on the role.
	UpdateUserInTeam(role *models.Role) error

	// RemoveUserFromTeam removes a user from a team
	RemoveUserFromTeam(role *models.Role) error

	// GetIDToken retrieves a billing token for a user. The billing token can be exchanged
	// to view billing information.
	GetIDToken(proj *models.Project, user *models.User) (token string, teamID string, err error)

	// ParseProjectUsageFromWebhook parses the project usage from a webhook payload sent
	// from a billing agent
	ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, error)

	// VerifySignature verifies the signature for a webhook
	VerifySignature(signature string, body []byte) bool
}

// NoopBillingManager performs no billing operations
type NoopBillingManager struct{}

func (n *NoopBillingManager) CreateTeam(proj *models.Project) (teamID string, err error) {
	return fmt.Sprintf("%d", proj.ID), nil
}

func (n *NoopBillingManager) DeleteTeam(proj *models.Project) (err error) {
	return nil
}

func (n *NoopBillingManager) GetTeamID(proj *models.Project) (teamID string, err error) {
	return fmt.Sprintf("%d", proj.ID), nil
}

func (n *NoopBillingManager) AddUserToTeam(teamID string, user *models.User, role *models.Role) error {
	return nil
}

func (n *NoopBillingManager) UpdateUserInTeam(role *models.Role) error {
	return nil
}

func (n *NoopBillingManager) RemoveUserFromTeam(role *models.Role) error {
	return nil
}

func (n *NoopBillingManager) GetIDToken(proj *models.Project, user *models.User) (token string, teamID string, err error) {
	return "", "", nil
}

func (n *NoopBillingManager) ParseProjectUsageFromWebhook(payload []byte) (*models.ProjectUsage, error) {
	return nil, nil
}

func (n *NoopBillingManager) VerifySignature(signature string, body []byte) bool {
	return false
}
