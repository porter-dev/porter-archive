package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

type DatabaseRepository interface {
	CreateDatabase(database *models.Database) (*models.Database, error)
	ReadDatabase(projectID, clusterID, databaseID uint) (*models.Database, error)
	ListDatabases(projectID, clusterID uint) ([]*models.Database, error)
	DeleteDatabase(projectID, clusterID, databaseID uint) error
}
