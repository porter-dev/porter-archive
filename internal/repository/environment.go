package repository

import "github.com/porter-dev/porter/internal/models"

type EnvironmentRepository interface {
	CreateEnvironment(env *models.Environment) (*models.Environment, error)
	ReadEnvironment(projectID, clusterID, gitInstallationID uint, gitRepoOwner, gitRepoName string) (*models.Environment, error)
	ReadEnvironmentByID(projectID, clusterID, envID uint) (*models.Environment, error)
	ReadEnvironmentByOwnerRepoName(projectID, clusterID uint, owner, repo string) (*models.Environment, error)
	ReadEnvironmentByWebhookIDOwnerRepoName(webhookID, owner, repo string) (*models.Environment, error)
	ListEnvironments(projectID, clusterID uint) ([]*models.Environment, error)
	UpdateEnvironment(environment *models.Environment) (*models.Environment, error)
	DeleteEnvironment(env *models.Environment) (*models.Environment, error)
	CreateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	ReadDeployment(environmentID uint, namespace string) (*models.Deployment, error)
	ReadDeploymentByID(projectID, clusterID, id uint) (*models.Deployment, error)
	ReadDeploymentByCluster(projectID, clusterID uint, namespace string) (*models.Deployment, error)
	ReadDeploymentByGitDetails(environmentID uint, owner, repo string, prNumber uint) (*models.Deployment, error)
	ListDeploymentsByCluster(projectID, clusterID uint, states ...string) ([]*models.Deployment, error)
	ListDeployments(environmentID uint, states ...string) ([]*models.Deployment, error)
	UpdateDeployment(deployment *models.Deployment) (*models.Deployment, error)
	DeleteDeployment(deployment *models.Deployment) (*models.Deployment, error)
}
