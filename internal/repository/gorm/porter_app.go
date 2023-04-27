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

func (repo *PorterAppRepository) ListPorterAppByClusterID(clusterID uint) ([]*models.PorterApp, error) {
	apps := []*models.PorterApp{}

	if err := repo.db.Where("cluster_id = ?", clusterID).Find(&apps).Error; err != nil {
		return nil, err
	}

	return apps, nil
}

func (repo *PorterAppRepository) ReadPorterApp(clusterID uint, name string) (*models.PorterApp, error) {
	app := &models.PorterApp{}

	if err := repo.db.Where("cluster_id = ? AND name = ?", clusterID, name).First(&app).Error; err != nil {
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
