package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type PolicyRepository struct {
	canQuery bool
	policies []*models.Policy
}

// NewPolicyRepository returns a PolicyRepository which uses
// gorm.DB for querying the database
func NewPolicyRepository(canQuery bool) repository.PolicyRepository {
	return &PolicyRepository{
		canQuery: canQuery,
	}
}

func (repo *PolicyRepository) CreatePolicy(policy *models.Policy) (*models.Policy, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.policies = append(repo.policies, policy)
	policy.ID = uint(len(repo.policies))

	return policy, nil
}

func (repo *PolicyRepository) ListPoliciesByProjectID(projectID uint) ([]*models.Policy, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	var res []*models.Policy

	for _, policy := range repo.policies {
		if policy.ProjectID == projectID {
			res = append(res, policy)
		}
	}

	return res, nil
}

func (repo *PolicyRepository) ReadPolicy(projectID uint, uid string) (*models.Policy, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	for _, policy := range repo.policies {
		if policy.ProjectID == projectID && policy.UniqueID == uid {
			return policy, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (repo *PolicyRepository) UpdatePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	for _, p := range repo.policies {
		if p.ID == policy.ID && p.UniqueID == policy.UniqueID {
			repo.policies[p.ID-1] = policy
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (repo *PolicyRepository) DeletePolicy(
	policy *models.Policy,
) (*models.Policy, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	if policy == nil || int(policy.ID-1) >= len(repo.policies) || repo.policies[policy.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	var newPolicies []*models.Policy

	for _, p := range repo.policies {
		if p.UniqueID != policy.UniqueID {
			newPolicies = append(newPolicies, p)
		}
	}

	repo.policies = newPolicies

	return policy, nil
}
