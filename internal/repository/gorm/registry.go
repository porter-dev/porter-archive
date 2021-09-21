package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// RegistryRepository uses gorm.DB for querying the database
type RegistryRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewRegistryRepository returns a RegistryRepository which uses
// gorm.DB for querying the database
func NewRegistryRepository(db *gorm.DB, key *[32]byte) repository.RegistryRepository {
	return &RegistryRepository{db, key}
}

// CreateRegistry creates a new registry
func (repo *RegistryRepository) CreateRegistry(reg *models.Registry) (*models.Registry, error) {
	err := repo.EncryptRegistryData(reg, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", reg.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Registries")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(reg); err != nil {
		return nil, err
	}

	// create a token cache by default
	assoc = repo.db.Model(reg).Association("TokenCache")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(&reg.TokenCache); err != nil {
		return nil, err
	}

	err = repo.DecryptRegistryData(reg, repo.key)

	if err != nil {
		return nil, err
	}

	return reg, nil
}

// ReadRegistry gets a registry specified by a unique id
func (repo *RegistryRepository) ReadRegistry(projectID, regID uint) (*models.Registry, error) {
	reg := &models.Registry{}

	if err := repo.db.Preload("TokenCache").Where("project_id = ? AND id = ?", projectID, regID).First(&reg).Error; err != nil {
		return nil, err
	}

	repo.DecryptRegistryData(reg, repo.key)

	return reg, nil
}

// ListRegistriesByProjectID finds all registries
// for a given project id
func (repo *RegistryRepository) ListRegistriesByProjectID(
	projectID uint,
) ([]*models.Registry, error) {
	regs := []*models.Registry{}

	if err := repo.db.Preload("TokenCache").Where("project_id = ?", projectID).Find(&regs).Error; err != nil {
		return nil, err
	}

	for _, reg := range regs {
		repo.DecryptRegistryData(reg, repo.key)
	}

	return regs, nil
}

// UpdateRegistry modifies an existing Registry in the database
func (repo *RegistryRepository) UpdateRegistry(
	reg *models.Registry,
) (*models.Registry, error) {
	if err := repo.db.Save(reg).Error; err != nil {
		return nil, err
	}

	return reg, nil
}

// UpdateRegistryTokenCache updates the token cache for a registry
func (repo *RegistryRepository) UpdateRegistryTokenCache(
	tokenCache *ints.RegTokenCache,
) (*models.Registry, error) {
	if tok := tokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, repo.key)

		if err != nil {
			return nil, err
		}

		tokenCache.Token = cipherData
	}

	registry := &models.Registry{}

	if err := repo.db.Where("id = ?", tokenCache.RegistryID).First(&registry).Error; err != nil {
		return nil, err
	}

	registry.TokenCache.Token = tokenCache.Token
	registry.TokenCache.Expiry = tokenCache.Expiry

	if err := repo.db.Save(registry).Error; err != nil {
		return nil, err
	}

	return registry, nil
}

// DeleteRegistry removes a registry from the db
func (repo *RegistryRepository) DeleteRegistry(
	reg *models.Registry,
) error {
	// clear TokenCache association
	assoc := repo.db.Model(reg).Association("TokenCache")

	if assoc.Error != nil {
		return assoc.Error
	}

	if err := assoc.Clear(); err != nil {
		return err
	}

	if err := repo.db.Where("id = ?", reg.ID).Delete(&models.Registry{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptRegistryData will encrypt the user's registry data before writing
// to the DB
func (repo *RegistryRepository) EncryptRegistryData(
	registry *models.Registry,
	key *[32]byte,
) error {
	if tok := registry.TokenCache.Token; len(tok) > 0 {
		cipherData, err := repository.Encrypt(tok, key)

		if err != nil {
			return err
		}

		registry.TokenCache.Token = cipherData
	}

	return nil
}

// DecryptRegistryData will decrypt the user's registry data before returning it
// from the DB
func (repo *RegistryRepository) DecryptRegistryData(
	registry *models.Registry,
	key *[32]byte,
) error {
	if tok := registry.TokenCache.Token; len(tok) > 0 {
		plaintext, err := repository.Decrypt(tok, key)

		if err != nil {
			return err
		}

		registry.TokenCache.Token = plaintext
	}

	return nil
}
