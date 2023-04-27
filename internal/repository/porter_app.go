package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// PorterAppRepository represents the set of queries on the PorterApp model
type PorterAppRepository interface {
	CreatePorterApp(app *models.PorterApp) (*models.PorterApp, error)
	// ListPorterAppByClusterID(clusterID uint) ([]*models.PorterApp, error)
	ReadPorterApp(clusterID uint, name string) (*models.PorterApp, error)
	UpdatePorterApp(app *models.PorterApp) (*models.PorterApp, error)
}
