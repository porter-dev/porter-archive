package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ServiceAccountRepository uses gorm.DB for querying the database
type ServiceAccountRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewServiceAccountRepository returns a ServiceAccountRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewServiceAccountRepository(db *gorm.DB, key *[32]byte) repository.ServiceAccountRepository {
	return &ServiceAccountRepository{db, key}
}

// CreateServiceAccountCandidate creates a new service account candidate
func (repo *ServiceAccountRepository) CreateServiceAccountCandidate(
	saCandidate *models.ServiceAccountCandidate,
) (*models.ServiceAccountCandidate, error) {
	err := repo.EncryptServiceAccountCandidateData(saCandidate, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", saCandidate.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("ServiceAccountCandidates")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(saCandidate); err != nil {
		return nil, err
	}

	return saCandidate, nil
}

// ReadServiceAccountCandidate finds a service account candidate by id
func (repo *ServiceAccountRepository) ReadServiceAccountCandidate(
	id uint,
) (*models.ServiceAccountCandidate, error) {
	saCandidate := &models.ServiceAccountCandidate{}

	if err := repo.db.Preload("Actions").Where("id = ?", id).First(&saCandidate).Error; err != nil {
		return nil, err
	}

	repo.DecryptServiceAccountCandidateData(saCandidate, repo.key)

	return saCandidate, nil
}

// ListServiceAccountCandidatesByProjectID finds all service account candidates
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountCandidatesByProjectID(
	projectID uint,
) ([]*models.ServiceAccountCandidate, error) {
	saCandidates := []*models.ServiceAccountCandidate{}

	if err := repo.db.Preload("Actions").Where("project_id = ?", projectID).Find(&saCandidates).Error; err != nil {
		return nil, err
	}

	for _, saCandidate := range saCandidates {
		repo.DecryptServiceAccountCandidateData(saCandidate, repo.key)
	}

	return saCandidates, nil
}

// UpdateServiceAccountCandidateCreatedSAID updates the CreatedServiceAccountID for
// a candidate, after the candidate has been resolved.
func (repo *ServiceAccountRepository) UpdateServiceAccountCandidateCreatedSAID(
	id uint,
	createdSAID uint,
) (*models.ServiceAccountCandidate, error) {
	saCandidate := &models.ServiceAccountCandidate{}

	if err := repo.db.Where("id = ?", id).First(&saCandidate).Error; err != nil {
		return nil, err
	}

	saCandidate.CreatedServiceAccountID = createdSAID

	if err := repo.db.Save(saCandidate).Error; err != nil {
		return nil, err
	}

	return saCandidate, nil
}

// CreateServiceAccount creates a new servicea account
func (repo *ServiceAccountRepository) CreateServiceAccount(
	sa *models.ServiceAccount,
) (*models.ServiceAccount, error) {
	err := repo.EncryptServiceAccountData(sa, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", sa.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("ServiceAccounts")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(sa); err != nil {
		return nil, err
	}

	// create a token cache by default
	assoc = repo.db.Model(sa).Association("TokenCache")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(&sa.TokenCache); err != nil {
		return nil, err
	}

	return sa, nil
}

// ReadServiceAccount finds a service account by id
func (repo *ServiceAccountRepository) ReadServiceAccount(
	id uint,
) (*models.ServiceAccount, error) {
	sa := &models.ServiceAccount{}

	// preload Clusters association
	if err := repo.db.Preload("Clusters").Preload("TokenCache").Where("id = ?", id).First(&sa).Error; err != nil {
		return nil, err
	}

	repo.DecryptServiceAccountData(sa, repo.key)

	return sa, nil
}

// ListServiceAccountsByProjectID finds all service accounts
// for a given project id
func (repo *ServiceAccountRepository) ListServiceAccountsByProjectID(
	projectID uint,
) ([]*models.ServiceAccount, error) {
	sas := []*models.ServiceAccount{}

	if err := repo.db.Preload("Clusters").Where("project_id = ?", projectID).Find(&sas).Error; err != nil {
		return nil, err
	}

	for _, sa := range sas {
		repo.DecryptServiceAccountData(sa, repo.key)
	}

	return sas, nil
}

// UpdateServiceAccountTokenCache updates the token cache for a service account
func (repo *ServiceAccountRepository) UpdateServiceAccountTokenCache(
	tokenCache *models.TokenCache,
) (*models.ServiceAccount, error) {
	if tok := tokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, repo.key)

		if err != nil {
			return nil, err
		}

		tokenCache.Token = cipherData
	}

	sa := &models.ServiceAccount{}

	if err := repo.db.Where("id = ?", tokenCache.ServiceAccountID).First(&sa).Error; err != nil {
		return nil, err
	}

	sa.TokenCache.Token = tokenCache.Token
	sa.TokenCache.Expiry = tokenCache.Expiry

	if err := repo.db.Save(sa).Error; err != nil {
		return nil, err
	}

	return sa, nil
}

// EncryptServiceAccountData will encrypt the user's service account data before writing
// to the DB
func (repo *ServiceAccountRepository) EncryptServiceAccountData(
	sa *models.ServiceAccount,
	key *[32]byte,
) error {
	if len(sa.ClientCertificateData) > 0 {
		cipherData, err := repository.Encrypt(sa.ClientCertificateData, key)

		if err != nil {
			return err
		}

		sa.ClientCertificateData = cipherData
	}

	if len(sa.ClientKeyData) > 0 {
		cipherData, err := repository.Encrypt(sa.ClientKeyData, key)

		if err != nil {
			return err
		}

		sa.ClientKeyData = cipherData
	}

	if len(sa.Token) > 0 {
		cipherData, err := repository.Encrypt(sa.Token, key)

		if err != nil {
			return err
		}

		sa.Token = cipherData
	}

	if len(sa.Username) > 0 {
		cipherData, err := repository.Encrypt(sa.Username, key)

		if err != nil {
			return err
		}

		sa.Username = cipherData
	}

	if len(sa.Password) > 0 {
		cipherData, err := repository.Encrypt(sa.Password, key)

		if err != nil {
			return err
		}

		sa.Password = cipherData
	}

	if len(sa.GCPKeyData) > 0 {
		cipherData, err := repository.Encrypt(sa.GCPKeyData, key)

		if err != nil {
			return err
		}

		sa.GCPKeyData = cipherData
	}

	if tok := sa.TokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, key)

		if err != nil {
			return err
		}

		sa.TokenCache.Token = cipherData
	}

	if len(sa.AWSAccessKeyID) > 0 {
		cipherData, err := repository.Encrypt(sa.AWSAccessKeyID, key)

		if err != nil {
			return err
		}

		sa.AWSAccessKeyID = cipherData
	}

	if len(sa.AWSSecretAccessKey) > 0 {
		cipherData, err := repository.Encrypt(sa.AWSSecretAccessKey, key)

		if err != nil {
			return err
		}

		sa.AWSSecretAccessKey = cipherData
	}

	if len(sa.AWSClusterID) > 0 {
		cipherData, err := repository.Encrypt(sa.AWSClusterID, key)

		if err != nil {
			return err
		}

		sa.AWSClusterID = cipherData
	}

	if len(sa.OIDCIssuerURL) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCIssuerURL, key)

		if err != nil {
			return err
		}

		sa.OIDCIssuerURL = cipherData
	}

	if len(sa.OIDCClientID) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCClientID, key)

		if err != nil {
			return err
		}

		sa.OIDCClientID = cipherData
	}

	if len(sa.OIDCClientSecret) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCClientSecret, key)

		if err != nil {
			return err
		}

		sa.OIDCClientSecret = cipherData
	}

	if len(sa.OIDCCertificateAuthorityData) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCCertificateAuthorityData, key)

		if err != nil {
			return err
		}

		sa.OIDCCertificateAuthorityData = cipherData
	}

	if len(sa.OIDCIDToken) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCIDToken, key)

		if err != nil {
			return err
		}

		sa.OIDCIDToken = cipherData
	}

	if len(sa.OIDCRefreshToken) > 0 {
		cipherData, err := repository.Encrypt(sa.OIDCRefreshToken, key)

		if err != nil {
			return err
		}

		sa.OIDCRefreshToken = cipherData
	}

	for i, cluster := range sa.Clusters {
		if len(cluster.CertificateAuthorityData) > 0 {
			cipherData, err := repository.Encrypt(cluster.CertificateAuthorityData, key)

			if err != nil {
				return err
			}

			cluster.CertificateAuthorityData = cipherData
			sa.Clusters[i] = cluster
		}
	}

	return nil
}

// EncryptServiceAccountCandidateData will encrypt the service account candidate data before
// writing to the DB
func (repo *ServiceAccountRepository) EncryptServiceAccountCandidateData(
	saCandidate *models.ServiceAccountCandidate,
	key *[32]byte,
) error {
	if len(saCandidate.Kubeconfig) > 0 {
		cipherData, err := repository.Encrypt(saCandidate.Kubeconfig, key)

		if err != nil {
			return err
		}

		saCandidate.Kubeconfig = cipherData
	}

	return nil
}

// DecryptServiceAccountData will decrypt the user's service account data before
// returning it from the DB
func (repo *ServiceAccountRepository) DecryptServiceAccountData(
	sa *models.ServiceAccount,
	key *[32]byte,
) error {
	if len(sa.ClientCertificateData) > 0 {
		plaintext, err := repository.Decrypt(sa.ClientCertificateData, key)

		if err != nil {
			return err
		}

		sa.ClientCertificateData = plaintext
	}

	if len(sa.ClientKeyData) > 0 {
		plaintext, err := repository.Decrypt(sa.ClientKeyData, key)

		if err != nil {
			return err
		}

		sa.ClientKeyData = plaintext
	}

	if len(sa.Token) > 0 {
		plaintext, err := repository.Decrypt(sa.Token, key)

		if err != nil {
			return err
		}

		sa.Token = plaintext
	}

	if len(sa.Username) > 0 {
		plaintext, err := repository.Decrypt(sa.Username, key)

		if err != nil {
			return err
		}

		sa.Username = plaintext
	}

	if len(sa.Password) > 0 {
		plaintext, err := repository.Decrypt(sa.Password, key)

		if err != nil {
			return err
		}

		sa.Password = plaintext
	}

	if len(sa.GCPKeyData) > 0 {
		plaintext, err := repository.Decrypt(sa.GCPKeyData, key)

		if err != nil {
			return err
		}

		sa.GCPKeyData = plaintext
	}

	if tok := sa.TokenCache.Token; len(tok) > 0 {
		plaintext, err := repository.Decrypt(tok, key)

		if err != nil {
			return err
		}

		sa.TokenCache.Token = plaintext
	}

	if len(sa.AWSAccessKeyID) > 0 {
		plaintext, err := repository.Decrypt(sa.AWSAccessKeyID, key)

		if err != nil {
			return err
		}

		sa.AWSAccessKeyID = plaintext
	}

	if len(sa.AWSSecretAccessKey) > 0 {
		plaintext, err := repository.Decrypt(sa.AWSSecretAccessKey, key)

		if err != nil {
			return err
		}

		sa.AWSSecretAccessKey = plaintext
	}

	if len(sa.AWSClusterID) > 0 {
		plaintext, err := repository.Decrypt(sa.AWSClusterID, key)

		if err != nil {
			return err
		}

		sa.AWSClusterID = plaintext
	}

	if len(sa.OIDCIssuerURL) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCIssuerURL, key)

		if err != nil {
			return err
		}

		sa.OIDCIssuerURL = plaintext
	}

	if len(sa.OIDCClientID) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCClientID, key)

		if err != nil {
			return err
		}

		sa.OIDCClientID = plaintext
	}

	if len(sa.OIDCClientSecret) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCClientSecret, key)

		if err != nil {
			return err
		}

		sa.OIDCClientSecret = plaintext
	}

	if len(sa.OIDCCertificateAuthorityData) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCCertificateAuthorityData, key)

		if err != nil {
			return err
		}

		sa.OIDCCertificateAuthorityData = plaintext
	}

	if len(sa.OIDCIDToken) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCIDToken, key)

		if err != nil {
			return err
		}

		sa.OIDCIDToken = plaintext
	}

	if len(sa.OIDCRefreshToken) > 0 {
		plaintext, err := repository.Decrypt(sa.OIDCRefreshToken, key)

		if err != nil {
			return err
		}

		sa.OIDCRefreshToken = plaintext
	}

	for i, cluster := range sa.Clusters {
		if len(cluster.CertificateAuthorityData) > 0 {
			plaintext, err := repository.Decrypt(cluster.CertificateAuthorityData, key)

			if err != nil {
				return err
			}

			cluster.CertificateAuthorityData = plaintext
			sa.Clusters[i] = cluster
		}
	}

	return nil
}

// DecryptServiceAccountCandidateData will decrypt the service account candidate data before
// returning it from the DB
func (repo *ServiceAccountRepository) DecryptServiceAccountCandidateData(
	saCandidate *models.ServiceAccountCandidate,
	key *[32]byte,
) error {
	if len(saCandidate.Kubeconfig) > 0 {
		plaintext, err := repository.Decrypt(saCandidate.Kubeconfig, key)

		if err != nil {
			return err
		}

		saCandidate.Kubeconfig = plaintext
	}

	return nil
}
