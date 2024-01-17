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
}
