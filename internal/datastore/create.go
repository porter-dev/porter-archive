package datastore

import (
	"context"

	"github.com/gofrs/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateOrGetDatastoreRecordInput struct {
	ProjectID uint
	ClusterID uint
	Name      string

	DatastoreRepository repository.DatastoreRepository
}

func CreateOrGetDatastoreRecord(ctx context.Context, inp CreateOrGetDatastoreRecordInput) (models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-or-get-datastore-record")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: inp.ProjectID},
		telemetry.AttributeKV{Key: "name", Value: inp.Name},
		telemetry.AttributeKV{Key: "cluster-id", Value: inp.ClusterID},
	)

	var datastore models.Datastore
	if inp.ProjectID == 0 {
		return datastore, telemetry.Error(ctx, span, nil, "project id is 0")
	}
	if inp.Name == "" {
		return datastore, telemetry.Error(ctx, span, nil, "name is empty")
	}

	cluster, err := inp.DatastoreRepository.GetByProjectIDAndName(ctx, inp.ProjectID, inp.Name)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error reading datastore by project id and name")
	}

	if cluster.ID != uuid.Nil {
		return cluster, nil
	}
}
