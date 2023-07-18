package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// EnvironmentConfigRepository uses gorm.DB for querying the database
type EnvironmentConfigRepository struct {
	db *gorm.DB
}

// NewEnvironmentConfigRepository returns a EnvironmentConfigRepository which uses
// gorm.DB for querying the database
func NewEnvironmentConfigRepository(db *gorm.DB) repository.EnvironmentConfigRepository {
	return &EnvironmentConfigRepository{db}
}

// ReadEnvironmentConfig gets an env config specified by a unique id
func (repo *EnvironmentConfigRepository) ReadEnvironmentConfig(projectID, clusterID, id uint) (*models.EnvironmentConfig, error) {
	env_config := &models.EnvironmentConfig{}

	if err := repo.db.Order("id desc").Where(
		"project_id = ? AND cluster_id = ? AND id = ?",
		projectID, clusterID, id,
	).First(&env_config).Error; err != nil {
		return nil, err
	}

	return env_config, nil
}
