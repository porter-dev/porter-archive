package gorm

import (
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// EnvironmentRepository uses gorm.DB for querying the database
type EnvironmentRepository struct {
	db *gorm.DB
}

// NewEnvironmentRepository returns a DefaultEnvironmentRepository which uses
// gorm.DB for querying the database
func NewEnvironmentRepository(db *gorm.DB) repository.EnvironmentRepository {
	return &EnvironmentRepository{db}
}

func (repo *EnvironmentRepository) CreateEnvironment(env *models.Environment) (*models.Environment, error) {
	if err := repo.db.Create(env).Error; err != nil {
		return nil, err
	}
	return env, nil
}

func (repo *EnvironmentRepository) ReadEnvironment(projectID, clusterID, gitInstallationID uint, gitRepoOwner, gitRepoName string) (*models.Environment, error) {
	env := &models.Environment{}
	if err := repo.db.Order("id desc").Where(
		"project_id = ? AND cluster_id = ? AND git_installation_id = ? AND git_repo_owner = LOWER(?) AND git_repo_name = LOWER(?)",
		projectID, clusterID, gitInstallationID,
		strings.ToLower(gitRepoOwner), strings.ToLower(gitRepoName),
	).First(&env).Error; err != nil {
		return nil, err
	}
	return env, nil
}

func (repo *EnvironmentRepository) ReadEnvironmentByID(projectID, clusterID, envID uint) (*models.Environment, error) {
	env := &models.Environment{}

	if err := repo.db.Order("id desc").Where(
		"project_id = ? AND cluster_id = ? AND id = ?",
		projectID, clusterID, envID,
	).First(&env).Error; err != nil {
		return nil, err
	}

	return env, nil
}

func (repo *EnvironmentRepository) ReadEnvironmentByOwnerRepoName(
	projectID, clusterID uint,
	gitRepoOwner, gitRepoName string,
) (*models.Environment, error) {
	env := &models.Environment{}
	if err := repo.db.Order("id desc").Where("project_id = ? AND cluster_id = ? AND git_repo_owner = LOWER(?) AND git_repo_name = LOWER(?)",
		projectID, clusterID, strings.ToLower(gitRepoOwner), strings.ToLower(gitRepoName),
	).First(&env).Error; err != nil {
		return nil, err
	}
	return env, nil
}

func (repo *EnvironmentRepository) ReadEnvironmentByWebhookIDOwnerRepoName(
	webhookID, gitRepoOwner, gitRepoName string,
) (*models.Environment, error) {
	env := &models.Environment{}
	if err := repo.db.Order("id desc").Where("webhook_id = ? AND git_repo_owner = LOWER(?) AND git_repo_name = LOWER(?)",
		webhookID, strings.ToLower(gitRepoOwner), strings.ToLower(gitRepoName),
	).First(&env).Error; err != nil {
		return nil, err
	}
	return env, nil
}

func (repo *EnvironmentRepository) ListEnvironments(projectID, clusterID uint) ([]*models.Environment, error) {
	envs := make([]*models.Environment, 0)

	if err := repo.db.Order("id asc").Where("project_id = ? AND cluster_id = ?", projectID, clusterID).Find(&envs).Error; err != nil {
		return nil, err
	}

	return envs, nil
}

func (repo *EnvironmentRepository) DeleteEnvironment(env *models.Environment) (*models.Environment, error) {
	if err := repo.db.Delete(&env).Error; err != nil {
		return nil, err
	}
	return env, nil
}

func (repo *EnvironmentRepository) CreateDeployment(deployment *models.Deployment) (*models.Deployment, error) {
	if err := repo.db.Create(deployment).Error; err != nil {
		return nil, err
	}
	return deployment, nil
}

func (repo *EnvironmentRepository) UpdateDeployment(deployment *models.Deployment) (*models.Deployment, error) {
	if err := repo.db.Save(deployment).Error; err != nil {
		return nil, err
	}

	return deployment, nil
}

func (repo *EnvironmentRepository) ReadDeployment(environmentID uint, namespace string) (*models.Deployment, error) {
	depl := &models.Deployment{}
	if err := repo.db.Order("id desc").Where("environment_id = ? AND namespace = ?", environmentID, namespace).First(&depl).Error; err != nil {
		return nil, err
	}
	return depl, nil
}

func (repo *EnvironmentRepository) ReadDeploymentByID(projectID, clusterID, id uint) (*models.Deployment, error) {
	depl := &models.Deployment{}

	if err := repo.db.
		Order("deployments.updated_at desc").
		Joins("INNER JOIN environments ON environments.id = deployments.environment_id").
		Where("environments.project_id = ? AND environments.cluster_id = ? AND deployments.id = ?", projectID, clusterID, id).First(&depl).Error; err != nil {
		return nil, err
	}

	return depl, nil
}

func (repo *EnvironmentRepository) ReadDeploymentByCluster(projectID, clusterID uint, namespace string) (*models.Deployment, error) {
	depl := &models.Deployment{}

	if err := repo.db.
		Order("deployments.id asc").
		Joins("INNER JOIN environments ON environments.id = deployments.environment_id").
		Where("environments.project_id = ? AND environments.cluster_id = ? AND environments.deleted_at IS NULL AND namespace = ?", projectID, clusterID, depl.Namespace).
		Find(&depl).Error; err != nil {
		return nil, err
	}

	return depl, nil
}

func (repo *EnvironmentRepository) ReadDeploymentByGitDetails(
	environmentID uint, gitRepoOwner, gitRepoName string, prNumber uint,
) (*models.Deployment, error) {
	depl := &models.Deployment{}

	if err := repo.db.Order("id asc").
		Where("environment_id = ? AND repo_owner = LOWER(?) AND repo_name = LOWER(?) AND pull_request_id = ?",
			environmentID, strings.ToLower(gitRepoOwner), strings.ToLower(gitRepoName), prNumber).
		First(&depl).Error; err != nil {
		return nil, err
	}

	return depl, nil
}

func (repo *EnvironmentRepository) ListDeploymentsByCluster(projectID, clusterID uint, states ...string) ([]*models.Deployment, error) {
	query := repo.db.
		Order("deployments.updated_at desc").
		Joins("INNER JOIN environments ON environments.id = deployments.environment_id").
		Where("environments.project_id = ? AND environments.cluster_id = ? AND environments.deleted_at IS NULL", projectID, clusterID)

	if len(states) > 0 {
		queryArr := make([]string, len(states))
		stateInterArr := make([]interface{}, len(states))

		for i, state := range states {
			queryArr[i] = "deployments.status = ?"
			stateInterArr[i] = state
		}

		query = query.Where(strings.Join(queryArr, " OR "), stateInterArr...)
	}

	depls := make([]*models.Deployment, 0)

	if err := query.Find(&depls).Error; err != nil {
		return nil, err
	}

	return depls, nil
}

func (repo *EnvironmentRepository) ListDeployments(environmentID uint, states ...string) ([]*models.Deployment, error) {
	query := repo.db.Debug().Order("deployments.updated_at desc").Where("environment_id = ?", environmentID)

	if len(states) > 0 {
		queryArr := make([]string, len(states))
		stateInterArr := make([]interface{}, len(states))

		for i, state := range states {
			queryArr[i] = "deployments.status = ?"
			stateInterArr[i] = state
		}

		query = query.Where(strings.Join(queryArr, " OR "), stateInterArr...)
	}

	depls := make([]*models.Deployment, 0)

	if err := query.Find(&depls).Error; err != nil {
		return nil, err
	}

	return depls, nil
}

func (repo *EnvironmentRepository) DeleteDeployment(deployment *models.Deployment) (*models.Deployment, error) {
	if err := repo.db.Delete(deployment).Error; err != nil {
		return nil, err
	}
	return deployment, nil
}
