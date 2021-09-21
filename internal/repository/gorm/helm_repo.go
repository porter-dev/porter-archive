package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// HelmRepoRepository uses gorm.DB for querying the database
type HelmRepoRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewHelmRepoRepository returns a HelmRepoRepository which uses
// gorm.DB for querying the database
func NewHelmRepoRepository(db *gorm.DB, key *[32]byte) repository.HelmRepoRepository {
	return &HelmRepoRepository{db, key}
}

// CreateHelmRepo creates a new helm repo
func (repo *HelmRepoRepository) CreateHelmRepo(hr *models.HelmRepo) (*models.HelmRepo, error) {
	err := repo.EncryptHelmRepoData(hr, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", hr.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("HelmRepos")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(hr); err != nil {
		return nil, err
	}

	// create a token cache by default
	assoc = repo.db.Model(hr).Association("TokenCache")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(&hr.TokenCache); err != nil {
		return nil, err
	}

	err = repo.DecryptHelmRepoData(hr, repo.key)

	if err != nil {
		return nil, err
	}

	return hr, nil
}

// ReadHelmRepo gets a helm repo specified by a unique id
func (repo *HelmRepoRepository) ReadHelmRepo(projectID, hrID uint) (*models.HelmRepo, error) {
	hr := &models.HelmRepo{}

	if err := repo.db.Preload("TokenCache").Where("project_id = ? AND id = ?", projectID, hrID).First(&hr).Error; err != nil {
		return nil, err
	}

	repo.DecryptHelmRepoData(hr, repo.key)

	return hr, nil
}

// ListHelmReposByProjectID finds all helm repos
// for a given project id
func (repo *HelmRepoRepository) ListHelmReposByProjectID(
	projectID uint,
) ([]*models.HelmRepo, error) {
	hrs := []*models.HelmRepo{}

	if err := repo.db.Preload("TokenCache").Where("project_id = ?", projectID).Find(&hrs).Error; err != nil {
		return nil, err
	}

	for _, hr := range hrs {
		repo.DecryptHelmRepoData(hr, repo.key)
	}

	return hrs, nil
}

// UpdateHelmRepo modifies an existing HelmRepo in the database
func (repo *HelmRepoRepository) UpdateHelmRepo(
	hr *models.HelmRepo,
) (*models.HelmRepo, error) {
	if err := repo.db.Save(hr).Error; err != nil {
		return nil, err
	}

	return hr, nil
}

// UpdateHelmRepoTokenCache updates the helm repo for a registry
func (repo *HelmRepoRepository) UpdateHelmRepoTokenCache(
	tokenCache *ints.HelmRepoTokenCache,
) (*models.HelmRepo, error) {
	if tok := tokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, repo.key)

		if err != nil {
			return nil, err
		}

		tokenCache.Token = cipherData
	}

	hr := &models.HelmRepo{}

	if err := repo.db.Where("id = ?", tokenCache.HelmRepoID).First(&hr).Error; err != nil {
		return nil, err
	}

	hr.TokenCache.Token = tokenCache.Token
	hr.TokenCache.Expiry = tokenCache.Expiry

	if err := repo.db.Save(hr).Error; err != nil {
		return nil, err
	}

	return hr, nil
}

// DeleteHelmRepo removes a registry from the db
func (repo *HelmRepoRepository) DeleteHelmRepo(
	hr *models.HelmRepo,
) error {
	// clear TokenCache association
	assoc := repo.db.Model(hr).Association("TokenCache")

	if assoc.Error != nil {
		return assoc.Error
	}

	if err := assoc.Clear(); err != nil {
		return err
	}

	if err := repo.db.Where("id = ?", hr.ID).Delete(&models.HelmRepo{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptHelmRepoData will encrypt the user's helm repo data before writing
// to the DB
func (repo *HelmRepoRepository) EncryptHelmRepoData(
	hr *models.HelmRepo,
	key *[32]byte,
) error {
	if tok := hr.TokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, key)

		if err != nil {
			return err
		}

		hr.TokenCache.Token = cipherData
	}

	return nil
}

// DecryptHelmRepoData will decrypt the user's helm repo data before returning it
// from the DB
func (repo *HelmRepoRepository) DecryptHelmRepoData(
	hr *models.HelmRepo,
	key *[32]byte,
) error {
	if tok := hr.TokenCache.Token; len(tok) > 0 {
		plaintext, err := repository.Decrypt(tok, key)

		if err != nil {
			return err
		}

		hr.TokenCache.Token = plaintext
	}

	return nil
}
