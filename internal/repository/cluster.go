package repository

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// ClusterRepository represents the set of queries on the
// Cluster model
type ClusterRepository interface {
	CreateClusterCandidate(cc *models.ClusterCandidate) (*models.ClusterCandidate, error)
	ReadClusterCandidate(projectID, ccID uint) (*models.ClusterCandidate, error)
	ListClusterCandidatesByProjectID(projectID uint) ([]*models.ClusterCandidate, error)
	UpdateClusterCandidateCreatedClusterID(id uint, createdClusterID uint) (*models.ClusterCandidate, error)

	CreateCluster(cluster *models.Cluster) (*models.Cluster, error)
	ReadCluster(projectID, clusterID uint) (*models.Cluster, error)
	ListClustersByProjectID(projectID uint) ([]*models.Cluster, error)
	UpdateCluster(cluster *models.Cluster) (*models.Cluster, error)
	UpdateClusterTokenCache(tokenCache *ints.ClusterTokenCache) (*models.Cluster, error)
	DeleteCluster(cluster *models.Cluster) error
}
