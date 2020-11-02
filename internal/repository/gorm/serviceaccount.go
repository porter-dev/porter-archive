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

	return saCandidates, nil
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

	return sa, nil
}

// ReadServiceAccount finds a service account by id
func (repo *ServiceAccountRepository) ReadServiceAccount(
	id uint,
) (*models.ServiceAccount, error) {
	sa := &models.ServiceAccount{}

	// preload Clusters association
	if err := repo.db.Preload("Clusters").Where("id = ?", id).First(&sa).Error; err != nil {
		return nil, err
	}

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

	return sas, nil
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

	if sa.Token != "" {
		cipherData, err := repository.Encrypt([]byte(sa.Token), key)

		if err != nil {
			return err
		}

		sa.Token = string(cipherData)
	}

	if sa.Username != "" {
		cipherData, err := repository.Encrypt([]byte(sa.Username), key)

		if err != nil {
			return err
		}

		sa.Username = string(cipherData)
	}

	if sa.Password != "" {
		cipherData, err := repository.Encrypt([]byte(sa.Password), key)

		if err != nil {
			return err
		}

		sa.Password = string(cipherData)
	}

	if len(sa.KeyData) > 0 {
		cipherData, err := repository.Encrypt(sa.KeyData, key)

		if err != nil {
			return err
		}

		sa.KeyData = cipherData
	}

	if sa.PrevToken != "" {
		cipherData, err := repository.Encrypt([]byte(sa.PrevToken), key)

		if err != nil {
			return err
		}

		sa.PrevToken = string(cipherData)
	}

	if sa.OIDCIssuerURL != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCIssuerURL), key)

		if err != nil {
			return err
		}

		sa.OIDCIssuerURL = string(cipherData)
	}

	if sa.OIDCClientID != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCClientID), key)

		if err != nil {
			return err
		}

		sa.OIDCClientID = string(cipherData)
	}

	if sa.OIDCClientSecret != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCClientSecret), key)

		if err != nil {
			return err
		}

		sa.OIDCClientSecret = string(cipherData)
	}

	if sa.OIDCCertificateAuthorityData != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCCertificateAuthorityData), key)

		if err != nil {
			return err
		}

		sa.OIDCCertificateAuthorityData = string(cipherData)
	}

	if sa.OIDCIDToken != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCIDToken), key)

		if err != nil {
			return err
		}

		sa.OIDCIDToken = string(cipherData)
	}

	if sa.OIDCRefreshToken != "" {
		cipherData, err := repository.Encrypt([]byte(sa.OIDCRefreshToken), key)

		if err != nil {
			return err
		}

		sa.OIDCRefreshToken = string(cipherData)
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
