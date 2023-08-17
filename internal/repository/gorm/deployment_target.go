package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// DeploymentTargetRepository uses gorm.DB for querying the database
type DeploymentTargetRepository struct {
	db *gorm.DB
}

// NewDeploymentTargetRepository returns a DeploymentTargetRepository which uses
// gorm.DB for querying the database
func NewDeploymentTargetRepository(db *gorm.DB) repository.DeploymentTargetRepository {
	return &DeploymentTargetRepository{db}
}

// DeploymentTargetBySelectorAndSelectorType finds a deployment target for a projectID and clusterID by its selector and selector type
func (repo *DeploymentTargetRepository) DeploymentTargetBySelectorAndSelectorType(projectID uint, clusterID uint, selector, selectorType string) (*models.DeploymentTarget, error) {
	deploymentTarget := &models.DeploymentTarget{}

	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND selector = ? AND selector_type = ?", projectID, clusterID, selector, selectorType).Limit(1).Find(&deploymentTarget).Error; err != nil {
		return nil, err
	}

	return deploymentTarget, nil
}
