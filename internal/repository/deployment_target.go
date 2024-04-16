package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// DeploymentTargetRepository represents the set of queries on the DeploymentTarget model
type DeploymentTargetRepository interface {
	// DeploymentTargetBySelectorAndSelectorType finds a deployment target for a projectID and clusterID by its selector and selector type
	DeploymentTargetBySelectorAndSelectorType(projectID uint, clusterID uint, selector, selectorType string) (*models.DeploymentTarget, error)
	// ListForCluster returns all deployment targets for a project and cluster
	ListForCluster(projectID uint, clusterID uint, preview bool) ([]*models.DeploymentTarget, error)
	// List returns all deployment targets for a project
	List(projectID uint, preview bool) ([]*models.DeploymentTarget, error)
	// CreateDeploymentTarget creates a new deployment target
	CreateDeploymentTarget(deploymentTarget *models.DeploymentTarget) (*models.DeploymentTarget, error)
	// DeploymentTarget retrieves a deployment target by its id if a uuid is provided or by name
	DeploymentTarget(projectID uint, deploymentTargetIdentifier string) (*models.DeploymentTarget, error)
	// DeploymentTargetById retrieves a deployment target by its uuid
	// This bypasses the projectID check, and should only be used to retrieve a deployment target for a cloud project.
	DeploymentTargetById(deploymentTargetIdentifier string) (*models.DeploymentTarget, error)
}
