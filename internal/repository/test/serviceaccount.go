package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ServiceAccountRepository implements repository.ServiceAccountRepository
type ServiceAccountRepository struct {
	canQuery                 bool
	serviceAccountCandidates []*models.ServiceAccountCandidate
	serviceAccounts          []*models.ServiceAccount
	clusters                 []*models.Cluster
}

// NewServiceAccountRepository will return errors if canQuery is false
func NewServiceAccountRepository(canQuery bool) repository.ServiceAccountRepository {
	return &ServiceAccountRepository{
		canQuery,
		[]*models.ServiceAccountCandidate{},
		[]*models.ServiceAccount{},
		[]*models.Cluster{},
	}
}

// CreateServiceAccountCandidate creates a new service account candidate
func (repo *ServiceAccountRepository) CreateServiceAccountCandidate(
	saCandidate *models.ServiceAccountCandidate,
) (*models.ServiceAccountCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.serviceAccountCandidates = append(repo.serviceAccountCandidates, saCandidate)
	saCandidate.ID = uint(len(repo.serviceAccountCandidates))

	return saCandidate, nil
}

// ReadServiceAccountCandidate finds a service account candidate by id
func (repo *ServiceAccountRepository) ReadServiceAccountCandidate(
	id uint,
) (*models.ServiceAccountCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.serviceAccountCandidates) || repo.serviceAccountCandidates[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.serviceAccountCandidates[index], nil
}

// DeleteServiceAccountCandidate deletes a service account candidate
func (repo *ServiceAccountRepository) DeleteServiceAccountCandidate(
	saCandidate *models.ServiceAccountCandidate,
) (*models.ServiceAccountCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(saCandidate.ID-1) >= len(repo.serviceAccountCandidates) || repo.serviceAccountCandidates[saCandidate.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(saCandidate.ID - 1)
	repo.serviceAccountCandidates[index] = nil

	return saCandidate, nil
}

// CreateServiceAccount creates a new servicea account
func (repo *ServiceAccountRepository) CreateServiceAccount(
	sa *models.ServiceAccount,
) (*models.ServiceAccount, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.serviceAccounts = append(repo.serviceAccounts, sa)
	sa.ID = uint(len(repo.serviceAccounts))

	for i, cluster := range sa.Clusters {
		(&cluster).ServiceAccountID = sa.ID
		sa.Clusters[i] = cluster
	}

	return sa, nil
}

// ReadServiceAccount finds a service account by id
func (repo *ServiceAccountRepository) ReadServiceAccount(
	id uint,
) (*models.ServiceAccount, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.serviceAccounts) || repo.serviceAccounts[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.serviceAccounts[index], nil
}

// DeleteServiceAccount deletes a service account
func (repo *ServiceAccountRepository) DeleteServiceAccount(
	sa *models.ServiceAccount,
) (*models.ServiceAccount, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(sa.ID-1) >= len(repo.serviceAccounts) || repo.serviceAccounts[sa.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(sa.ID - 1)
	repo.serviceAccounts[index] = nil

	return sa, nil
}
