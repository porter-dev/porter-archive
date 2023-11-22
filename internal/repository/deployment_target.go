package repository

import (
	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

// DeploymentTargetRepository represents the set of queries on the DeploymentTarget model
type DeploymentTargetRepository interface {
	// DeploymentTargetBySelectorAndSelectorType finds a deployment target for a projectID and clusterID by its selector and selector type
	DeploymentTargetBySelectorAndSelectorType(projectID uint, clusterID uint, selector, selectorType string) (*models.DeploymentTarget, error)
	// DeploymentTargetByID does not scope by projectID and should only be used for internal queries when project id cannot be known.  This should never be exposed to the user.
	DeploymentTargetByID(id uuid.UUID) (*models.DeploymentTarget, error)
	// DefaultDeploymentTarget finds the deployment target marked as default for the project id and cluster id
	DefaultDeploymentTarget(projectID uint, clusterID uint) (*models.DeploymentTarget, error)
	// List returns all deployment targets for a project
	List(projectID uint, clusterID uint, preview bool) ([]*models.DeploymentTarget, error)
	// CreateDeploymentTarget creates a new deployment target
	CreateDeploymentTarget(deploymentTarget *models.DeploymentTarget) (*models.DeploymentTarget, error)
}
