package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectUsageRepository implements repository.ProjectUsageRepository
type ProjectUsageRepository struct {
	db *gorm.DB
}

// NewProjectUsageRepository will return errors if canQuery is false
func NewProjectUsageRepository(db *gorm.DB) repository.ProjectUsageRepository {
	return &ProjectUsageRepository{db}
}

// CreateProjectUsage creates a new project usage limit
func (repo *ProjectUsageRepository) CreateProjectUsage(
	usage *models.ProjectUsage,
) (*models.ProjectUsage, error) {
	if err := repo.db.Create(usage).Error; err != nil {
		return nil, err
	}

	return usage, nil
}

// ReadProjectUsage finds the project usage matching a project ID
func (repo *ProjectUsageRepository) ReadProjectUsage(
	projID uint,
) (*models.ProjectUsage, error) {
	res := &models.ProjectUsage{}

	if err := repo.db.Where("project_id = ?", projID).First(res).Error; err != nil {
		return nil, err
	}

	return res, nil
}

// UpdateProjectUsage modifies an existing ProjectUsage in the database
func (repo *ProjectUsageRepository) UpdateProjectUsage(
	usage *models.ProjectUsage,
) (*models.ProjectUsage, error) {
	if err := repo.db.Save(usage).Error; err != nil {
		return nil, err
	}

	return usage, nil
}

// CreateProjectUsageCache creates a new project usage cache
func (repo *ProjectUsageRepository) CreateProjectUsageCache(
	cache *models.ProjectUsageCache,
) (*models.ProjectUsageCache, error) {
	if err := repo.db.Create(cache).Error; err != nil {
		return nil, err
	}

	return cache, nil
}

// ReadProjectUsageCache finds the project usage cache matching a project ID
func (repo *ProjectUsageRepository) ReadProjectUsageCache(
	projID uint,
) (*models.ProjectUsageCache, error) {
	res := &models.ProjectUsageCache{}

	if err := repo.db.Where("project_id = ?", projID).First(res).Error; err != nil {
		return nil, err
	}

	return res, nil
}

// UpdateProjectUsageCache modifies an existing ProjectUsageCache in the database
func (repo *ProjectUsageRepository) UpdateProjectUsageCache(
	cache *models.ProjectUsageCache,
) (*models.ProjectUsageCache, error) {
	if err := repo.db.Save(cache).Error; err != nil {
		return nil, err
	}

	return cache, nil
}
