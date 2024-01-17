package gorm

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

// DatastoreRepository uses gorm.DB for querying the database
type DatastoreRepository struct {
	db *gorm.DB
}

// NewDatastoreRepository returns a DatastoreRepository
func NewDatastoreRepository(db *gorm.DB) *DatastoreRepository {
	return &DatastoreRepository{db}
}

// Insert inserts a datastore into the database
func (repo *DatastoreRepository) Insert(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-insert-datastore")
	defer span.End()

	if datastore == nil {
		return nil, telemetry.Error(ctx, span, nil, "datastore is nil")
	}

	if datastore.ProjectID == 0 {
		return nil, telemetry.Error(ctx, span, nil, "project id is 0")
	}

	if datastore.Name == "" {
		return nil, telemetry.Error(ctx, span, nil, "name is empty")
	}

	if datastore.CloudProvider == "" {
		return nil, telemetry.Error(ctx, span, nil, "cloud provider is empty")
	}

	if datastore.CloudProviderID == "" {
		return nil, telemetry.Error(ctx, span, nil, "cloud provider id is empty")
	}

	if datastore.Type == "" {
		return nil, telemetry.Error(ctx, span, nil, "type is empty")
	}

	if datastore.Engine == "" {
		return nil, telemetry.Error(ctx, span, nil, "engine is empty")
	}

	if datastore.ID == uuid.Nil {
		datastore.ID = uuid.New()
	}
	if datastore.CreatedAt.IsZero() {
		datastore.CreatedAt = time.Now().UTC()
	}
	if datastore.UpdatedAt.IsZero() {
		datastore.UpdatedAt = time.Now().UTC()
	}

	if err := repo.db.Save(datastore).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error saving datastore")
	}

	return datastore, nil
}

// GetByProjectIDAndName returns a datastore by project ID and name
func (repo *DatastoreRepository) GetByProjectIDAndName(ctx context.Context, projectId uint, name string) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-get-datastore")
	defer span.End()

	if projectId == 0 {
		return nil, telemetry.Error(ctx, span, nil, "project id is 0")
	}
	if name == "" {
		return nil, telemetry.Error(ctx, span, nil, "name is empty")
	}

	datastore := &models.Datastore{}
	if err := repo.db.Where("project_id = ? AND name = ?", projectId, name).Limit(1).Find(&datastore).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error finding datastore")
	}

	return datastore, nil
}
