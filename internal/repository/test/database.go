package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type DatabaseRepository struct {
}

func NewDatabaseRepository() repository.DatabaseRepository {
	return &DatabaseRepository{}
}

func (repo *DatabaseRepository) CreateDatabase(database *models.Database) (*models.Database, error) {
	panic("unimplemented")
}

func (repo *DatabaseRepository) ReadDatabase(projectID uint, databaseID uint) (*models.Database, error) {
	panic("unimplemented")
}

func (repo *DatabaseRepository) ListDatabases(projectID uint) ([]*models.Database, error) {
	panic("unimplemented")
}
