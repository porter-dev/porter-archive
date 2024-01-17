package datastore

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/telemetry"
)

type CreateOrGetDatastoreRecordInput struct {
	ProjectID uint
	ClusterID uint
	Name      string
}

func CreateOrGetDatastoreRecord(ctx context.Context, inp CreateOrGetDatastoreRecordInput) (models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-or-get-datastore-record")
	defer span.End()

	var datastore models.Datastore
	if inp.ProjectID == 0 {
		return datastore, telemetry.Error(ctx, span, nil, "project id is 0")
	}
	if inp.Name == "" {
		return datastore, telemetry.Error(ctx, span, nil, "name is empty")
	}
}
