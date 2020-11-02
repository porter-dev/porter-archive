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

// ListServiceAccountCandidatesByProjectID finds all service account candidates
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountCandidatesByProjectID(
	projectID uint,
) ([]*models.ServiceAccountCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.ServiceAccountCandidate, 0)

	for _, saCandidate := range repo.serviceAccountCandidates {
		if saCandidate.ProjectID == projectID {
			res = append(res, saCandidate)
		}
	}

	return res, nil
}

// CreateServiceAccount creates a new servicea account
func (repo *ServiceAccountRepository) CreateServiceAccount(
	sa *models.ServiceAccount,
) (*models.ServiceAccount, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if sa == nil {
		return nil, nil
	}

	repo.serviceAccounts = append(repo.serviceAccounts, sa)
	sa.ID = uint(len(repo.serviceAccounts))

	for i, cluster := range sa.Clusters {
		(&cluster).ServiceAccountID = sa.ID
		clusterP, _ := repo.createCluster(&cluster)
		sa.Clusters[i] = *clusterP
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

// ListServiceAccountsByProjectID finds all service accounts
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountsByProjectID(
	projectID uint,
) ([]*models.ServiceAccount, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.ServiceAccount, 0)

	for _, sa := range repo.serviceAccounts {
		if sa.ProjectID == projectID {
			res = append(res, sa)
		}
	}

	return res, nil
}

func (repo *ServiceAccountRepository) createCluster(
	cluster *models.Cluster,
) (*models.Cluster, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if cluster == nil {
		return nil, nil
	}

	repo.clusters = append(repo.clusters, cluster)
	cluster.ID = uint(len(repo.clusters))

	return cluster, nil
}
