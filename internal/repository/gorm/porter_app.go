package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PorterAppRepository uses gorm.DB for querying the database
type PorterAppRepository struct {
	db *gorm.DB
}

// NewPorterAppRepository returns a PorterAppRepository which uses
// gorm.DB for querying the database
func NewPorterAppRepository(db *gorm.DB) repository.PorterAppRepository {
	return &PorterAppRepository{db}
}

func (repo *PorterAppRepository) CreatePorterApp(a *models.PorterApp) (*models.PorterApp, error) {
	if err := repo.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}

func (repo *PorterAppRepository) ListPorterAppByClusterID(clusterID, envConfigID uint) ([]*models.PorterApp, error) {
	apps := []*models.PorterApp{}

	if envConfigID == 0 {
		// get porter_apps where environment_config is default by joining on environment_config_id
		if err := repo.db.Joins("JOIN environment_configs ON porter_apps.environment_config_id = environment_configs.id").Where("porter_apps.cluster_id = ? AND environment_configs.is_default = true", clusterID).Find(&apps).Error; err != nil {
			return nil, err
		}

		return apps, nil
	}

	if err := repo.db.Where("cluster_id = ? AND environment_config_id = ?", clusterID, envConfigID).Find(&apps).Error; err != nil {
		return nil, err
	}

	return apps, nil
}

func (repo *PorterAppRepository) ReadPorterAppByName(clusterID uint, name string, envConfigID uint) (*models.PorterApp, error) {
	app := &models.PorterApp{}

	if envConfigID == 0 {
		// get porter_app where environment_config is default by joining on environment_config_id
		if err := repo.db.Joins("JOIN environment_configs ON porter_apps.environment_config_id = environment_configs.id").Where("porter_apps.cluster_id = ? AND porter_apps.name = ? AND environment_configs.is_default = true", clusterID, name).First(&app).Error; err != nil {
			return nil, err
		}

		return app, nil
	}

	if err := repo.db.Where("cluster_id = ? AND name = ? AND environment_config_id = ?", clusterID, name, envConfigID).First(&app).Error; err != nil {
		return nil, err
	}

	return app, nil
}

func (repo *PorterAppRepository) UpdatePorterApp(app *models.PorterApp) (*models.PorterApp, error) {
	if err := repo.db.Save(app).Error; err != nil {
		return nil, err
	}

	return app, nil
}

func (repo *PorterAppRepository) DeletePorterApp(app *models.PorterApp) (*models.PorterApp, error) {
	if err := repo.db.Delete(&app).Error; err != nil {
		return nil, err
	}

	return app, nil
}
