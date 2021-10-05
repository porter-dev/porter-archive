// +build ee

package gorm

import (
	"github.com/porter-dev/porter/ee/models"
	"github.com/porter-dev/porter/ee/repository"
	"gorm.io/gorm"
)

// ProjectBillingRepository uses gorm.DB for querying the database
type ProjectBillingRepository struct {
	db *gorm.DB
}

func NewProjectBillingRepository(db *gorm.DB) repository.ProjectBillingRepository {
	return &ProjectBillingRepository{db}
}

func (repo *ProjectBillingRepository) CreateProjectBilling(projBilling *models.ProjectBilling) (*models.ProjectBilling, error) {
	if err := repo.db.Create(projBilling).Error; err != nil {
		return nil, err
	}

	return projBilling, nil
}

func (repo *ProjectBillingRepository) ReadProjectBillingByProjectID(projID uint) (*models.ProjectBilling, error) {
	projBilling := &models.ProjectBilling{}

	if err := repo.db.Where("project_id = ?", projID).First(&projBilling).Error; err != nil {
		return nil, err
	}

	return projBilling, nil
}

func (repo *ProjectBillingRepository) ReadProjectBillingByTeamID(teamID string) (*models.ProjectBilling, error) {
	projBilling := &models.ProjectBilling{}

	if err := repo.db.Where("billing_team_id = ?", teamID).First(&projBilling).Error; err != nil {
		return nil, err
	}

	return projBilling, nil
}
