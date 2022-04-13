package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type PolicyRepository struct {
	canQuery bool
}

// NewPolicyRepository returns a PolicyRepository which uses
// gorm.DB for querying the database
func NewPolicyRepository(canQuery bool) repository.PolicyRepository {
	return &PolicyRepository{canQuery}
}

func (repo *PolicyRepository) CreatePolicy(a *models.Policy) (*models.Policy, error) {
	panic("unimplemented")
}

func (repo *PolicyRepository) ListPoliciesByProjectID(projectID uint) ([]*models.Policy, error) {
	panic("unimplemented")
}

func (repo *PolicyRepository) ReadPolicy(projectID uint, uid string) (*models.Policy, error) {
	panic("unimplemented")
}

func (repo *PolicyRepository) UpdatePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	panic("unimplemented")
}

func (repo *PolicyRepository) DeletePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	panic("unimplemented")
}
