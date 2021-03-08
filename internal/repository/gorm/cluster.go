package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// ClusterRepository uses gorm.DB for querying the database
type ClusterRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewClusterRepository returns a ClusterRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewClusterRepository(db *gorm.DB, key *[32]byte) repository.ClusterRepository {
	return &ClusterRepository{db, key}
}

// CreateClusterCandidate creates a new cluster candidate
func (repo *ClusterRepository) CreateClusterCandidate(
	cc *models.ClusterCandidate,
) (*models.ClusterCandidate, error) {
	err := repo.EncryptClusterCandidateData(cc, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", cc.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("ClusterCandidates")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(cc); err != nil {
		return nil, err
	}

	// decrypt at the end to return
	err = repo.DecryptClusterCandidateData(cc, repo.key)

	if err != nil {
		return nil, err
	}

	return cc, nil
}

// ReadClusterCandidate finds a cluster candidate by id
func (repo *ClusterRepository) ReadClusterCandidate(
	id uint,
) (*models.ClusterCandidate, error) {
	cc := &models.ClusterCandidate{}

	if err := repo.db.Preload("Resolvers").Where("id = ?", id).First(&cc).Error; err != nil {
		return nil, err
	}

	repo.DecryptClusterCandidateData(cc, repo.key)

	return cc, nil
}

// ListClusterCandidatesByProjectID finds all cluster candidates
// for a given project id
func (repo *ClusterRepository) ListClusterCandidatesByProjectID(
	projectID uint,
) ([]*models.ClusterCandidate, error) {
	ccs := []*models.ClusterCandidate{}

	if err := repo.db.Preload("Resolvers").Where("project_id = ?", projectID).Find(&ccs).Error; err != nil {
		return nil, err
	}

	for _, cc := range ccs {
		repo.DecryptClusterCandidateData(cc, repo.key)
	}

	return ccs, nil
}

// UpdateClusterCandidateCreatedClusterID updates the CreatedClusterID for
// a candidate, after the candidate has been resolved.
func (repo *ClusterRepository) UpdateClusterCandidateCreatedClusterID(
	id uint,
	createdClusterID uint,
) (*models.ClusterCandidate, error) {
	cc := &models.ClusterCandidate{}

	if err := repo.db.Where("id = ?", id).First(&cc).Error; err != nil {
		return nil, err
	}

	cc.CreatedClusterID = createdClusterID

	if err := repo.db.Save(cc).Error; err != nil {
		return nil, err
	}

	repo.DecryptClusterCandidateData(cc, repo.key)

	return cc, nil
}

// CreateCluster creates a new cluster
func (repo *ClusterRepository) CreateCluster(
	cluster *models.Cluster,
) (*models.Cluster, error) {
	ctxDB := repo.db.WithContext(context.Background())

	err := repo.EncryptClusterData(cluster, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := ctxDB.Where("id = ?", cluster.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := ctxDB.Model(&project).Association("Clusters")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(cluster); err != nil {
		return nil, err
	}

	// create a token cache by default
	assoc = ctxDB.Model(cluster).Association("TokenCache")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(&cluster.TokenCache); err != nil {
		return nil, err
	}

	err = repo.DecryptClusterData(cluster, repo.key)

	if err != nil {
		return nil, err
	}

	return cluster, nil
}

// ReadCluster finds a cluster by id
func (repo *ClusterRepository) ReadCluster(
	id uint,
) (*models.Cluster, error) {
	ctxDB := repo.db.WithContext(context.Background())

	cluster := &models.Cluster{}

	// preload Clusters association
	if err := ctxDB.Preload("TokenCache").Where("id = ?", id).First(&cluster).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptClusterData(cluster, repo.key)

	if err != nil {
		return nil, err
	}

	return cluster, nil
}

// ListClustersByProjectID finds all clusters
// for a given project id
func (repo *ClusterRepository) ListClustersByProjectID(
	projectID uint,
) ([]*models.Cluster, error) {
	ctxDB := repo.db.WithContext(context.Background())

	clusters := []*models.Cluster{}

	if err := ctxDB.Where("project_id = ?", projectID).Find(&clusters).Error; err != nil {
		return nil, err
	}

	for _, cluster := range clusters {
		repo.DecryptClusterData(cluster, repo.key)
	}

	return clusters, nil
}

// UpdateCluster modifies an existing Cluster in the database
func (repo *ClusterRepository) UpdateCluster(
	cluster *models.Cluster,
) (*models.Cluster, error) {
	ctxDB := repo.db.WithContext(context.Background())

	err := repo.EncryptClusterData(cluster, repo.key)

	if err != nil {
		return nil, err
	}

	if err := ctxDB.Save(cluster).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptClusterData(cluster, repo.key)

	if err != nil {
		return nil, err
	}

	return cluster, nil
}

// UpdateClusterTokenCache updates the token cache for a cluster
func (repo *ClusterRepository) UpdateClusterTokenCache(
	tokenCache *ints.ClusterTokenCache,
) (*models.Cluster, error) {
	ctxDB := repo.db.WithContext(context.Background())

	if tok := tokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, repo.key)

		if err != nil {
			return nil, err
		}

		tokenCache.Token = cipherData
	}

	cluster := &models.Cluster{}

	if err := ctxDB.Where("id = ?", tokenCache.ClusterID).First(&cluster).Error; err != nil {
		return nil, err
	}

	// delete the existing token cache first
	if err := ctxDB.Where("id = ?", tokenCache.ID).Unscoped().Delete(&cluster.TokenCache).Error; err != nil {
		return nil, err
	}

	// set the new token cache
	cluster.TokenCache.Token = tokenCache.Token
	cluster.TokenCache.Expiry = tokenCache.Expiry

	if err := ctxDB.Save(cluster).Error; err != nil {
		return nil, err
	}

	return cluster, nil
}

// DeleteCluster removes a cluster from the db
func (repo *ClusterRepository) DeleteCluster(
	cluster *models.Cluster,
) error {
	// clear TokenCache association
	assoc := repo.db.Model(cluster).Association("TokenCache")

	if assoc.Error != nil {
		return assoc.Error
	}

	if err := assoc.Clear(); err != nil {
		return err
	}

	if err := repo.db.Where("id = ?", cluster.ID).Delete(&models.Cluster{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptClusterData will encrypt the user's service account data before writing
// to the DB
func (repo *ClusterRepository) EncryptClusterData(
	cluster *models.Cluster,
	key *[32]byte,
) error {
	if len(cluster.CertificateAuthorityData) > 0 {
		cipherData, err := repository.Encrypt(cluster.CertificateAuthorityData, key)

		if err != nil {
			return err
		}

		cluster.CertificateAuthorityData = cipherData
	}

	if tok := cluster.TokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, key)

		if err != nil {
			return err
		}

		cluster.TokenCache.Token = cipherData
	}

	return nil
}

// EncryptClusterCandidateData will encrypt the service account candidate data before
// writing to the DB
func (repo *ClusterRepository) EncryptClusterCandidateData(
	cc *models.ClusterCandidate,
	key *[32]byte,
) error {
	if len(cc.AWSClusterIDGuess) > 0 {
		cipherData, err := repository.Encrypt(cc.AWSClusterIDGuess, key)

		if err != nil {
			return err
		}

		cc.AWSClusterIDGuess = cipherData
	}

	if len(cc.Kubeconfig) > 0 {
		cipherData, err := repository.Encrypt(cc.Kubeconfig, key)

		if err != nil {
			return err
		}

		cc.Kubeconfig = cipherData
	}

	return nil
}

// DecryptClusterData will decrypt the user's service account data before
// returning it from the DB
func (repo *ClusterRepository) DecryptClusterData(
	cluster *models.Cluster,
	key *[32]byte,
) error {
	if len(cluster.CertificateAuthorityData) > 0 {
		plaintext, err := repository.Decrypt(cluster.CertificateAuthorityData, key)

		if err != nil {
			return err
		}

		cluster.CertificateAuthorityData = plaintext
	}

	if tok := cluster.TokenCache.Token; len(tok) > 0 {
		plaintext, err := repository.Decrypt(tok, key)

		// in the case that the token cache is down, set empty token
		if err != nil {
			cluster.TokenCache.Token = []byte{}
		} else {
			cluster.TokenCache.Token = plaintext
		}
	}

	return nil
}

// DecryptClusterCandidateData will decrypt the service account candidate data before
// returning it from the DB
func (repo *ClusterRepository) DecryptClusterCandidateData(
	cc *models.ClusterCandidate,
	key *[32]byte,
) error {
	if len(cc.AWSClusterIDGuess) > 0 {
		plaintext, err := repository.Decrypt(cc.AWSClusterIDGuess, key)

		if err != nil {
			return err
		}

		cc.AWSClusterIDGuess = plaintext
	}

	if len(cc.Kubeconfig) > 0 {
		plaintext, err := repository.Decrypt(cc.Kubeconfig, key)

		if err != nil {
			return err
		}

		cc.Kubeconfig = plaintext
	}

	return nil
}
