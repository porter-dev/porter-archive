package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

type DatabaseRepository interface {
	CreateDatabase(database *models.Database) (*models.Database, error)
	ReadDatabase(projectID, databaseID uint) (*models.Database, error)
	ListDatabases(projectID uint) ([]*models.Database, error)
}
