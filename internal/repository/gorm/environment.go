package gorm

import (
	"fmt"
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

	switch repo.db.Dialector.Name() {
	case "sqlite":
		if err := repo.db.Order("id desc").Where(
			"project_id = ? AND cluster_id = ? AND git_installation_id = ? AND git_repo_owner LIKE ? AND git_repo_name LIKE ?",
			projectID, clusterID, gitInstallationID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
	case "postgres":
		if err := repo.db.Order("id desc").Where(
			"project_id = ? AND cluster_id = ? AND git_installation_id = ? AND git_repo_owner iLIKE ? AND git_repo_name iLIKE ?",
			projectID, clusterID, gitInstallationID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
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

	switch repo.db.Dialector.Name() {
	case "sqlite":
		if err := repo.db.Order("id desc").Where("project_id = ? AND cluster_id = ? AND git_repo_owner LIKE ? AND git_repo_name LIKE ?",
			projectID, clusterID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
	case "postgres":
		if err := repo.db.Order("id desc").Where("project_id = ? AND cluster_id = ? AND git_repo_owner iLIKE ? AND git_repo_name iLIKE ?",
			projectID, clusterID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
	}

	return env, nil
}

func (repo *EnvironmentRepository) ReadEnvironmentByWebhookIDOwnerRepoName(
	webhookID, gitRepoOwner, gitRepoName string,
) (*models.Environment, error) {
	env := &models.Environment{}

	switch repo.db.Dialector.Name() {
	case "sqlite":
		if err := repo.db.Order("id desc").Where("webhook_id = ? AND git_repo_owner LIKE ? AND git_repo_name LIKE ?",
			webhookID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
	case "postgres":
		if err := repo.db.Order("id desc").Where("webhook_id = ? AND git_repo_owner iLIKE ? AND git_repo_name iLIKE ?",
			webhookID, gitRepoOwner, gitRepoName,
		).First(&env).Error; err != nil {
			return nil, err
		}
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

func (repo *EnvironmentRepository) UpdateEnvironment(environment *models.Environment) (*models.Environment, error) {
	if err := repo.db.Save(environment).Error; err != nil {
		return nil, err
	}

	return environment, nil
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

func (repo *EnvironmentRepository) ReadDeploymentByGitDetails(
	environmentID uint, gitRepoOwner, gitRepoName string, prNumber uint,
) (*models.Deployment, error) {
	depl := &models.Deployment{}

	switch repo.db.Dialector.Name() {
	case "sqlite":
		if err := repo.db.Order("id asc").
			Where("environment_id = ? AND repo_owner LIKE ? AND repo_name LIKE ? AND pull_request_id = ?",
				environmentID, gitRepoOwner, gitRepoName, prNumber).
			First(&depl).Error; err != nil {
			return nil, err
		}
	case "postgres":
		if err := repo.db.Order("id asc").
			Where("environment_id = ? AND repo_owner iLIKE ? AND repo_name iLIKE ? AND pull_request_id = ?",
				environmentID, gitRepoOwner, gitRepoName, prNumber).
			First(&depl).Error; err != nil {
			return nil, err
		}
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
	depl := &models.Deployment{}

	if err := repo.db.Where("id = ?", deployment.ID).First(&depl).Error; err != nil {
		return nil, fmt.Errorf("error fetching deployment ID %d: %w", deployment.ID, err)
	}

	revisions, err := repo.ListDeploymentRevisions(depl.ID)

	if err != nil {
		return nil, fmt.Errorf("error fetching revisions for deployment ID %d: %w", depl.ID, err)
	}

	err = repo.db.Model(&depl).Association("Revisions").Clear()

	if err != nil {
		return nil, fmt.Errorf("error clearing revision associations for deployment ID %d: %w", depl.ID, err)
	}

	for _, rev := range revisions {
		err := repo.db.Model(&rev).Association("Resources").Clear()

		if err != nil {
			return nil, fmt.Errorf("error clearing resource associations for revision ID %d: %w", rev.ID, err)
		}

		for _, res := range rev.Resources {
			if err := repo.db.Delete(&res).Error; err != nil {
				return nil, fmt.Errorf("error deleting resource ID %d: %w", res.ID, err)
			}
		}

		if err := repo.db.Delete(&rev).Error; err != nil {
			return nil, fmt.Errorf("error deleting revision ID %d: %w", rev.ID, err)
		}
	}

	if err := repo.db.Delete(deployment).Error; err != nil {
		return nil, fmt.Errorf("error deleting deployment ID %d: %w", deployment.ID, err)
	}

	return deployment, nil
}

func (repo *EnvironmentRepository) AddNewDeploymentRevision(deploymentID uint, revision *models.DeploymentRevision) (*models.DeploymentRevision, error) {
	if deploymentID == 0 {
		return nil, fmt.Errorf("deployment ID cannot be set to 0")
	}

	depl := &models.Deployment{}

	if err := repo.db.Where("id = ?", deploymentID).First(&depl).Error; err != nil {
		return nil, fmt.Errorf("error fetching deployment ID %d: %w", deploymentID, err)
	}

	assoc := repo.db.Model(&depl).Association("Revisions")

	if assoc.Error != nil {
		return nil, fmt.Errorf("error fetting association Revisions for deployment ID %d: %w", deploymentID, assoc.Error)
	}

	revision.RevisionNumber = uint(assoc.Count() + 1)

	if err := assoc.Append(revision); err != nil {
		return nil, fmt.Errorf("error appending new revision for deployment ID %d: %w", deploymentID, err)
	}

	return revision, nil
}

func (repo *EnvironmentRepository) ListDeploymentRevisions(deploymentID uint) ([]*models.DeploymentRevision, error) {
	depl := &models.Deployment{}

	if err := repo.db.Where("id = ?", deploymentID).First(&depl).Error; err != nil {
		return nil, fmt.Errorf("error fetching deployment ID %d: %w", deploymentID, err)
	}

	var revisions []*models.DeploymentRevision

	// FIXME: use proper pagination
	if err := repo.db.Preload("Resources").Where("deployment_id = ?", deploymentID).Order("revision_number desc").Limit(25).Find(&revisions).Error; err != nil {
		return nil, fmt.Errorf("error fetching revisions for deployment ID %d: %w", deploymentID, err)
	}

	return revisions, nil
}

func (repo *EnvironmentRepository) ReadDeploymentRevision(deploymentID, revisionNumber uint) (*models.DeploymentRevision, error) {
	depl := &models.Deployment{}

	if err := repo.db.Where("id = ?", deploymentID).First(&depl).Error; err != nil {
		return nil, fmt.Errorf("error fetching deployment ID %d: %w", deploymentID, err)
	}

	revision := &models.DeploymentRevision{}

	if err := repo.db.Preload("Resources").Where("deployment_id = ? AND revision_number = ?", deploymentID, revisionNumber).First(&revision).Error; err != nil {
		return nil, fmt.Errorf("error fetching revision number %d for deployment ID %d: %w", revisionNumber, deploymentID, err)
	}

	return revision, nil
}
