package gorm

import (
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

func (repo *EnvironmentRepository) ReadEnvironment(projectID, clusterID, gitInstallationID uint) (*models.Environment, error) {
	env := &models.Environment{}
	if err := repo.db.Order("id desc").Where("project_id = ? AND cluster_id = ? AND git_installation_id = ?", projectID, clusterID, gitInstallationID).First(&env).Error; err != nil {
		return nil, err
	}
	return env, nil
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
	if err := repo.db.Order("id desc").Where("environment_id = ? AND namespace = ?", environmentID).First(&depl).Error; err != nil {
		return nil, err
	}
	return depl, nil
}

func (repo *EnvironmentRepository) DeleteDeployment(deployment *models.Deployment) (*models.Deployment, error) {
	if err := repo.db.Delete(deployment).Error; err != nil {
		return nil, err
	}
	return deployment, nil
}
