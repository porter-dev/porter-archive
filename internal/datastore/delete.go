package datastore

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// DeleteDatastoreRecordInput is the input type for DeleteDatastoreRecord
type DeleteDatastoreRecordInput struct {
	ProjectID uint
	Name      string

	DatastoreRepository repository.DatastoreRepository
}

// DeleteDatastoreRecord deletes a datastore record by name
func DeleteDatastoreRecord(ctx context.Context, inp DeleteDatastoreRecordInput) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "delete-datastore-record")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: inp.ProjectID},
		telemetry.AttributeKV{Key: "name", Value: inp.Name},
	)

	datastore, err := inp.DatastoreRepository.GetByProjectIDAndName(ctx, inp.ProjectID, inp.Name)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error reading datastore by project id and name")
	}

	if datastore == nil || datastore.ID == uuid.Nil {
		return datastore, telemetry.Error(ctx, span, nil, "datastore not found in table")
	}

	datastore, err = inp.DatastoreRepository.Delete(ctx, datastore)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error deleting datastore")
	}

	return datastore, nil
}
