package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PreviewEnvironmentRepository uses gorm.DB for querying the database
type PreviewEnvironmentRepository struct {
	db *gorm.DB
}

// NewPreviewEnvironmentRepository returns a PreviewEnvironmentRepository which uses
// gorm.DB for querying the database
func NewPreviewEnvironmentRepository(db *gorm.DB) repository.PreviewEnvironmentRepository {
	return &PreviewEnvironmentRepository{db}
}

func (repo *PreviewEnvironmentRepository) CreatePreviewEnvironment(a *models.PreviewEnvironment) (*models.PreviewEnvironment, error) {
	if err := repo.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}
