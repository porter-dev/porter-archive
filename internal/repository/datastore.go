package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

// DatastoreRepository represents the set of queries on the Datastore model
type DatastoreRepository interface {
	// GetByProjectIDAndName retrieves a datastore by project id and name
	GetByProjectIDAndName(ctx context.Context, projectID uint, name string) (*models.Datastore, error)
	// Insert inserts a datastore into the database
	Insert(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error)
	// ListByProjectID retrieves a list of datastores by project id
	ListByProjectID(ctx context.Context, projectID uint) ([]*models.Datastore, error)
	// Delete deletes a datastore by id
	Delete(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error)
	// UpdateStatus updates the status of a datastore
	UpdateStatus(ctx context.Context, datastore *models.Datastore, status models.DatastoreStatus) (*models.Datastore, error)
}
