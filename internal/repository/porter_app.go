package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// PorterAppRepository represents the set of queries on the PorterApp model
type PorterAppRepository interface {
	ReadPorterAppByName(clusterID uint, name string, envConfigID uint) (*models.PorterApp, error)
	CreatePorterApp(app *models.PorterApp) (*models.PorterApp, error)
	ListPorterAppByClusterID(clusterID uint, envConfigID uint) ([]*models.PorterApp, error)
	UpdatePorterApp(app *models.PorterApp) (*models.PorterApp, error)
	DeletePorterApp(app *models.PorterApp) (*models.PorterApp, error)
}
