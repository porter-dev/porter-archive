package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectOnboardingRepository implements repository.ProjectOnboardingRepository
type ProjectOnboardingRepository struct {
	db *gorm.DB
}

// NewProjectOnboardingRepository will return errors if canQuery is false
func NewProjectOnboardingRepository(db *gorm.DB) repository.ProjectOnboardingRepository {
	return &ProjectOnboardingRepository{db}
}

// CreateProjectOnboarding creates a new project onboarding limit
func (repo *ProjectOnboardingRepository) CreateProjectOnboarding(
	onboarding *models.Onboarding,
) (*models.Onboarding, error) {
	if err := repo.db.Create(onboarding).Error; err != nil {
		return nil, err
	}

	return onboarding, nil
}

// ReadProjectOnboarding finds the project onboarding matching a project ID
func (repo *ProjectOnboardingRepository) ReadProjectOnboarding(
	projID uint,
) (*models.Onboarding, error) {
	res := &models.Onboarding{}

	if err := repo.db.Where("project_id = ?", projID).First(res).Error; err != nil {
		return nil, err
	}

	return res, nil
}

// UpdateProjectOnboarding modifies an existing ProjectOnboarding in the database
func (repo *ProjectOnboardingRepository) UpdateProjectOnboarding(
	onboarding *models.Onboarding,
) (*models.Onboarding, error) {
	if err := repo.db.Save(onboarding).Error; err != nil {
		return nil, err
	}

	return onboarding, nil
}
