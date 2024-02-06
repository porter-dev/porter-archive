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

// GetByProjectIDAndName retrieves a datastore by project id and name
func (repo *DatastoreRepository) GetByProjectIDAndName(ctx context.Context, projectID uint, name string) (*models.Datastore, error) {
	return nil, errors.New("cannot read database")
}

// Insert inserts a datastore into the database
func (repo *DatastoreRepository) Insert(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error) {
	return nil, errors.New("cannot write database")
}

// ListByProjectID retrieves a list of datastores by project id
func (repo *DatastoreRepository) ListByProjectID(ctx context.Context, projectID uint) ([]*models.Datastore, error) {
	return nil, errors.New("cannot read database")
}

// Delete deletes a datastore by id
func (repo *DatastoreRepository) Delete(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error) {
	return nil, errors.New("cannot write database")
}

// UpdateStatus updates the status of a datastore
func (repo *DatastoreRepository) UpdateStatus(ctx context.Context, datastore *models.Datastore, status models.DatastoreStatus) (*models.Datastore, error) {
	return nil, errors.New("cannot write database")
}
