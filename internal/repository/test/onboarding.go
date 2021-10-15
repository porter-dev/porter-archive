package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectOnboardingRepository implements repository.ProjectOnboardingRepository
type ProjectOnboardingRepository struct {
	canQuery    bool
	onboardings []*models.Onboarding
}

// NewProjectOnboardingRepository will return errors if canQuery is false
func NewProjectOnboardingRepository(canQuery bool) repository.ProjectOnboardingRepository {
	return &ProjectOnboardingRepository{
		canQuery,
		[]*models.Onboarding{},
	}
}

// CreateProjectOnboarding creates a new project onboarding limit
func (repo *ProjectOnboardingRepository) CreateProjectOnboarding(
	onboarding *models.Onboarding,
) (*models.Onboarding, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if onboarding == nil {
		return nil, nil
	}

	repo.onboardings = append(repo.onboardings, onboarding)

	return onboarding, nil
}

// CreateProjectOnboarding reads a project onboarding by project id
func (repo *ProjectOnboardingRepository) ReadProjectOnboarding(
	projID uint,
) (*models.Onboarding, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, pu := range repo.onboardings {
		if pu != nil && pu.ProjectID == projID {
			return pu, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// UpdateProjectOnboarding modifies an existing ProjectOnboarding in the database
func (repo *ProjectOnboardingRepository) UpdateProjectOnboarding(
	onboarding *models.Onboarding,
) (*models.Onboarding, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(onboarding.ID-1) >= len(repo.onboardings) || repo.onboardings[onboarding.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(onboarding.ID - 1)
	repo.onboardings[index] = onboarding

	return onboarding, nil
}
