package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectUsageRepository implements repository.ProjectUsageRepository
type ProjectUsageRepository struct {
	canQuery bool
	usages   []*models.ProjectUsage
	caches   []*models.ProjectUsageCache
}

// NewProjectUsageRepository will return errors if canQuery is false
func NewProjectUsageRepository(canQuery bool) repository.ProjectUsageRepository {
	return &ProjectUsageRepository{
		canQuery,
		[]*models.ProjectUsage{},
		[]*models.ProjectUsageCache{},
	}
}

// CreateProjectUsage creates a new project usage limit
func (repo *ProjectUsageRepository) CreateProjectUsage(
	usage *models.ProjectUsage,
) (*models.ProjectUsage, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if usage == nil {
		return nil, nil
	}

	repo.usages = append(repo.usages, usage)

	return usage, nil
}

// CreateProjectUsage reads a project usage by project id
func (repo *ProjectUsageRepository) ReadProjectUsage(
	projID uint,
) (*models.ProjectUsage, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, pu := range repo.usages {
		if pu != nil && pu.ProjectID == projID {
			return pu, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// UpdateProjectUsage modifies an existing ProjectUsage in the database
func (repo *ProjectUsageRepository) UpdateProjectUsage(
	usage *models.ProjectUsage,
) (*models.ProjectUsage, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(usage.ID-1) >= len(repo.usages) || repo.usages[usage.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(usage.ID - 1)
	repo.usages[index] = usage

	return usage, nil
}

// CreateProjectUsageCache creates a new project usage cache
func (repo *ProjectUsageRepository) CreateProjectUsageCache(
	cache *models.ProjectUsageCache,
) (*models.ProjectUsageCache, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if cache == nil {
		return nil, nil
	}

	repo.caches = append(repo.caches, cache)

	return cache, nil
}

// CreateProjectUsageCache reads a project usage by project id
func (repo *ProjectUsageRepository) ReadProjectUsageCache(
	projID uint,
) (*models.ProjectUsageCache, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, puc := range repo.caches {
		if puc != nil && puc.ProjectID == projID {
			return puc, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// UpdateProjectUsageCache modifies an existing ProjectUsageCache in the database
func (repo *ProjectUsageRepository) UpdateProjectUsageCache(
	cache *models.ProjectUsageCache,
) (*models.ProjectUsageCache, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(cache.ID-1) >= len(repo.caches) || repo.usages[cache.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(cache.ID - 1)
	repo.caches[index] = cache

	return cache, nil
}
