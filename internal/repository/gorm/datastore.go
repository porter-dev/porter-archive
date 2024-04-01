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

	if datastore.CloudProviderCredentialIdentifier == "" {
		return nil, telemetry.Error(ctx, span, nil, "cloud provider credential identifier is empty")
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

// ListByProjectID returns a list of datastores by project ID
func (repo *DatastoreRepository) ListByProjectID(ctx context.Context, projectId uint) ([]*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-list-datastores")
	defer span.End()

	if projectId == 0 {
		return nil, telemetry.Error(ctx, span, nil, "project id is 0")
	}

	datastores := []*models.Datastore{}
	if err := repo.db.Where("project_id = ?", projectId).Find(&datastores).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error finding datastores")
	}

	return datastores, nil
}

// Delete deletes a datastore by id
func (repo *DatastoreRepository) Delete(ctx context.Context, datastore *models.Datastore) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-delete-datastore")
	defer span.End()

	if datastore == nil {
		return nil, telemetry.Error(ctx, span, nil, "datastore is nil")
	}

	if datastore.ID == uuid.Nil {
		return nil, telemetry.Error(ctx, span, nil, "datastore id is nil")
	}

	if err := repo.db.Delete(&datastore).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error deleting datastore")
	}

	return datastore, nil
}

// UpdateStatus updates the status of a datastore
func (repo *DatastoreRepository) UpdateStatus(ctx context.Context, datastore *models.Datastore, status models.DatastoreStatus) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-update-datastore-status")
	defer span.End()

	if datastore == nil {
		return nil, telemetry.Error(ctx, span, nil, "datastore is nil")
	}

	if datastore.ID == uuid.Nil {
		return nil, telemetry.Error(ctx, span, nil, "datastore id is nil")
	}

	if status == "" {
		return nil, telemetry.Error(ctx, span, nil, "status is empty")
	}

	datastore.Status = status
	datastore.UpdatedAt = time.Now().UTC()

	if err := repo.db.Save(datastore).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error updating datastore status")
	}

	return datastore, nil
}
