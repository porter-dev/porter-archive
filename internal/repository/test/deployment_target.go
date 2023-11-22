package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// DeploymentTargetRepository is a test repository that implements repository.DeploymentTargetRepository
type DeploymentTargetRepository struct {
	canQuery bool
}

// NewDeploymentTargetRepository returns the test DeploymentTargetRepository
func NewDeploymentTargetRepository() repository.DeploymentTargetRepository {
	return &DeploymentTargetRepository{canQuery: false}
}

// DeploymentTargetBySelectorAndSelectorType finds a deployment target for a projectID and clusterID by its selector and selector type
func (repo *DeploymentTargetRepository) DeploymentTargetBySelectorAndSelectorType(projectID uint, clusterID uint, selector, selectorType string) (*models.DeploymentTarget, error) {
	return nil, errors.New("cannot read database")
}

// DefaultDeploymentTarget is dummy
func (repo *DeploymentTargetRepository) DefaultDeploymentTarget(projectID uint, clusterID uint) (*models.DeploymentTarget, error) {
	return nil, errors.New("cannot read database")
}

// List returns all deployment targets for a project
func (repo *DeploymentTargetRepository) List(projectID uint, clusterID uint, preview bool) ([]*models.DeploymentTarget, error) {
	return nil, errors.New("cannot read database")
}

// CreateDeploymentTarget creates a new deployment target
func (repo *DeploymentTargetRepository) CreateDeploymentTarget(deploymentTarget *models.DeploymentTarget) (*models.DeploymentTarget, error) {
	return nil, errors.New("cannot write database")
}
