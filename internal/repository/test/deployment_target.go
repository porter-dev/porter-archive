package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// DeploymentTargetRepository uses gorm.DB for querying the database
type DeploymentTargetRepository struct {
	canQuery bool
}

// NewDeploymentTargetRepository returns a DeploymentTargetRepository which uses
// gorm.DB for querying the database
func NewDeploymentTargetRepository() repository.DeploymentTargetRepository {
	return &DeploymentTargetRepository{canQuery: false}
}

// DeploymentTargetBySelectorAndSelectorType finds a deployment target for a projectID and clusterID by its selector and selector type
func (repo *DeploymentTargetRepository) DeploymentTargetBySelectorAndSelectorType(projectID uint, clusterID uint, selector, selectorType string) (*models.DeploymentTarget, error) {
	return nil, errors.New("cannot read database")
}
