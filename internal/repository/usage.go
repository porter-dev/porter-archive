package repository

import "github.com/porter-dev/porter/internal/models"

// ProjectUsageRepository represents the set of queries on the ProjectUsage model
type ProjectUsageRepository interface {
	CreateProjectUsage(usage *models.ProjectUsage) (*models.ProjectUsage, error)
	ReadProjectUsage(projID uint) (*models.ProjectUsage, error)
	UpdateProjectUsage(cache *models.ProjectUsage) (*models.ProjectUsage, error)
	CreateProjectUsageCache(cache *models.ProjectUsageCache) (*models.ProjectUsageCache, error)
	ReadProjectUsageCache(projID uint) (*models.ProjectUsageCache, error)
	UpdateProjectUsageCache(cache *models.ProjectUsageCache) (*models.ProjectUsageCache, error)
}
