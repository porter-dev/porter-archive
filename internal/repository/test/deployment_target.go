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

// List returns all deployment targets for a project
func (repo *DeploymentTargetRepository) List(projectID uint) ([]*models.DeploymentTarget, error) {
	return nil, errors.New("cannot read database")
}
