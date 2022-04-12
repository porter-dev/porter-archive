package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// PolicyRepository represents the set of queries on the Policy model
type PolicyRepository interface {
	CreatePolicy(policy *models.Policy) (*models.Policy, error)
	ListPoliciesByProjectID(projectID uint) ([]*models.Policy, error)
	ReadPolicy(projectID uint, uid string) (*models.Policy, error)
	UpdatePolicy(token *models.Policy) (*models.Policy, error)
	DeletePolicy(policy *models.Policy) (*models.Policy, error)
}
