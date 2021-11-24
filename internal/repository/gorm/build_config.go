package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// BuildConfigRepository uses gorm.DB for querying the database
type BuildConfigRepository struct {
	db *gorm.DB
}

// NewBuildConfigRepository returns a BuildConfigRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewBuildConfigRepository(db *gorm.DB) repository.BuildConfigRepository {
	return &BuildConfigRepository{db}
}

// CreateBuildConfig creates a new build config for a release
func (repo *BuildConfigRepository) CreateBuildConfig(bc *models.BuildConfig) (*models.BuildConfig, error) {
	if err := repo.db.Create(bc).Error; err != nil {
		return nil, err
	}

	return bc, nil
}

// UpdateBuildConfig updates a build config
func (repo *BuildConfigRepository) UpdateBuildConfig(bc *models.BuildConfig) (*models.BuildConfig, error) {
	if err := repo.db.Save(bc).Error; err != nil {
		return nil, err
	}

	return bc, nil
}

// GetBuildConfig returns a BuildConfig with the specified id
func (repo *BuildConfigRepository) GetBuildConfig(id uint) (*models.BuildConfig, error) {
	bc := &models.BuildConfig{}

	if err := repo.db.First(bc, id).Error; err != nil {
		return nil, err
	}

	return bc, nil
}
