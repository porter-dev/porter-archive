package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// DatastoreRepository is a test repository that implements repository.DatastoreRepository
type DatastoreRepository struct {
	canQuery bool
}

// NewDatastoreRepository returns the test DatastoreRepository
func NewDatastoreRepository() repository.DatastoreRepository {
	return &DatastoreRepository{canQuery: false}
}

func (repo *DatastoreRepository) GetByProjectIDAndName(ctx context.Context, projectID uint, name string) (*models.Datastore, error) {
	return nil, errors.New("cannot read database")
}

func (repo *DatastoreRepository) Insert(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error) {
	return nil, errors.New("cannot write database")
}
