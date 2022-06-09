package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PolicyRepository uses gorm.DB for querying the database
type PolicyRepository struct {
	db *gorm.DB
}

// NewPolicyRepository returns a PolicyRepository which uses
// gorm.DB for querying the database
func NewPolicyRepository(db *gorm.DB) repository.PolicyRepository {
	return &PolicyRepository{db}
}

func (repo *PolicyRepository) CreatePolicy(a *models.Policy) (*models.Policy, error) {
	if err := repo.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}

func (repo *PolicyRepository) ListPoliciesByProjectID(projectID uint) ([]*models.Policy, error) {
	policys := []*models.Policy{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&policys).Error; err != nil {
		return nil, err
	}

	return policys, nil
}

func (repo *PolicyRepository) ReadPolicy(projectID uint, uid string) (*models.Policy, error) {
	policy := &models.Policy{}

	if err := repo.db.Where("project_id = ? AND unique_id = ?", projectID, uid).First(&policy).Error; err != nil {
		return nil, err
	}

	return policy, nil
}

func (repo *PolicyRepository) UpdatePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	if err := repo.db.Save(policy).Error; err != nil {
		return nil, err
	}

	return policy, nil
}

func (repo *PolicyRepository) DeletePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	if err := repo.db.Delete(&policy).Error; err != nil {
		return nil, err
	}
	return policy, nil
}
