package repository

import "github.com/porter-dev/porter/internal/models"

type EnvironmentRepository interface {
	CreateEnvironment(env *models.Environment) (*models.Environment, error)
	ReadEnvironment(projectID, clusterID, gitInstallationID uint, gitRepoOwner, gitRepoName string) (*models.Environment, error)
	ListEnvironments(projectID, clusterID uint) ([]*models.Environment, error)
	DeleteEnvironment(env *models.Environment) (*models.Environment, error)
	CreateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	ReadDeployment(environmentID uint, namespace string) (*models.Deployment, error)
	ReadDeploymentByCluster(projectID, clusterID uint, namespace string) (*models.Deployment, error)
	ListDeploymentsByCluster(projectID, clusterID uint) ([]*models.Deployment, error)
	ListDeployments(environmentID uint) ([]*models.Deployment, error)
	UpdateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	DeleteDeployment(deployment *models.Deployment) (*models.Deployment, error)
}
