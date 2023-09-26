package gorm

import (
	"errors"
	"time"

	"github.com/google/uuid"
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

// List finds all deployment targets for a given project
func (repo *DeploymentTargetRepository) List(projectID uint, clusterID uint, preview bool) ([]*models.DeploymentTarget, error) {
	deploymentTargets := []*models.DeploymentTarget{}
	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND preview = ?", projectID, clusterID, preview).Find(&deploymentTargets).Error; err != nil {
		return nil, err
	}

	return deploymentTargets, nil
}

// CreateDeploymentTarget creates a new deployment target
func (repo *DeploymentTargetRepository) CreateDeploymentTarget(deploymentTarget *models.DeploymentTarget) (*models.DeploymentTarget, error) {
	if deploymentTarget == nil {
		return nil, errors.New("deployment target is nil")
	}
	if deploymentTarget.Selector == "" {
		return nil, errors.New("deployment target selector is empty")
	}
	if deploymentTarget.SelectorType == "" {
		return nil, errors.New("deployment target selector type is empty")
	}
	if deploymentTarget.ClusterID == 0 {
		return nil, errors.New("deployment target cluster id is empty")
	}
	if deploymentTarget.ProjectID == 0 {
		return nil, errors.New("deployment target project id is empty")
	}

	if deploymentTarget.ID == uuid.Nil {
		deploymentTarget.ID = uuid.New()
	}
	if deploymentTarget.CreatedAt.IsZero() {
		deploymentTarget.CreatedAt = time.Now().UTC()
	}
	if deploymentTarget.UpdatedAt.IsZero() {
		deploymentTarget.UpdatedAt = time.Now().UTC()
	}

	if err := repo.db.Create(deploymentTarget).Error; err != nil {
		return nil, err
	}

	return deploymentTarget, nil
}
