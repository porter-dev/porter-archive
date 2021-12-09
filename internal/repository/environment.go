package repository

import "github.com/porter-dev/porter/internal/models"

type EnvironmentRepository interface {
	CreateEnvironment(env *models.Environment) (*models.Environment, error)
	ReadEnvironment(projectID, clusterID, gitInstallationID uint) (*models.Environment, error)
	ListEnvironments(projectID, clusterID uint) ([]*models.Environment, error)
	DeleteEnvironment(env *models.Environment) (*models.Environment, error)
	CreateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	ReadDeployment(environmentID uint, namespace string) (*models.Deployment, error)
	UpdateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	DeleteDeployment(deployment *models.Deployment) (*models.Deployment, error)
}
