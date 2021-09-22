package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// ClusterRepository implements repository.ClusterRepository
type ClusterRepository struct {
	canQuery          bool
	clusterCandidates []*models.ClusterCandidate
	clusters          []*models.Cluster
}

// NewClusterRepository will return errors if canQuery is false
func NewClusterRepository(canQuery bool) repository.ClusterRepository {
	return &ClusterRepository{
		canQuery,
		[]*models.ClusterCandidate{},
		[]*models.Cluster{},
	}
}

// CreateClusterCandidate creates a new cluster candidate
func (repo *ClusterRepository) CreateClusterCandidate(
	cc *models.ClusterCandidate,
) (*models.ClusterCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.clusterCandidates = append(repo.clusterCandidates, cc)
	cc.ID = uint(len(repo.clusterCandidates))

	return cc, nil
}

// ReadClusterCandidate finds a service account candidate by id
func (repo *ClusterRepository) ReadClusterCandidate(projectID, id uint) (*models.ClusterCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.clusterCandidates) || repo.clusterCandidates[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.clusterCandidates[index], nil
}

// ListClusterCandidatesByProjectID finds all service account candidates
// for a given project id
func (repo *ClusterRepository) ListClusterCandidatesByProjectID(
	projectID uint,
) ([]*models.ClusterCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.ClusterCandidate, 0)

	for _, saCandidate := range repo.clusterCandidates {
		if saCandidate.ProjectID == projectID {
			res = append(res, saCandidate)
		}
	}

	return res, nil
}

// UpdateClusterCandidateCreatedClusterID updates the CreatedClusterID for
// a candidate, after the candidate has been resolved.
func (repo *ClusterRepository) UpdateClusterCandidateCreatedClusterID(
	id uint,
	createdClusterID uint,
) (*models.ClusterCandidate, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	index := int(id - 1)
	repo.clusterCandidates[index].CreatedClusterID = createdClusterID

	return repo.clusterCandidates[index], nil
}

// CreateCluster creates a new servicea account
func (repo *ClusterRepository) CreateCluster(
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

// ReadCluster finds a service account by id
func (repo *ClusterRepository) ReadCluster(
	projectID, id uint,
) (*models.Cluster, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.clusters) || repo.clusters[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.clusters[index], nil
}

// ListClustersByProjectID finds all service accounts
// for a given project id
func (repo *ClusterRepository) ListClustersByProjectID(
	projectID uint,
) ([]*models.Cluster, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.Cluster, 0)

	for _, cluster := range repo.clusters {
		if cluster != nil && cluster.ProjectID == projectID {
			res = append(res, cluster)
		}
	}

	return res, nil
}

// UpdateCluster modifies an existing Cluster in the database
func (repo *ClusterRepository) UpdateCluster(
	cluster *models.Cluster,
) (*models.Cluster, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(cluster.ID-1) >= len(repo.clusters) || repo.clusters[cluster.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(cluster.ID - 1)
	repo.clusters[index] = cluster

	return cluster, nil
}

// UpdateClusterTokenCache updates the token cache for a cluster
func (repo *ClusterRepository) UpdateClusterTokenCache(
	tokenCache *ints.ClusterTokenCache,
) (*models.Cluster, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	index := int(tokenCache.ClusterID - 1)
	repo.clusters[index].TokenCache.Token = tokenCache.Token
	repo.clusters[index].TokenCache.Expiry = tokenCache.Expiry

	return repo.clusters[index], nil
}

// DeleteCluster removes a cluster from the array by setting it to nil
func (repo *ClusterRepository) DeleteCluster(
	cluster *models.Cluster,
) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(cluster.ID-1) >= len(repo.clusters) || repo.clusters[cluster.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(cluster.ID - 1)
	repo.clusters[index] = nil

	return nil
}
