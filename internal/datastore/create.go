package datastore

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// CreateOrGetRecordInput is the input type for CreateOrGetDatastoreRecord
type CreateOrGetRecordInput struct {
	ProjectID uint
	ClusterID uint
	Name      string
	Type      string
	Engine    string

	DatastoreRepository repository.DatastoreRepository
	ClusterRepository   repository.ClusterRepository
}

// CreateOrGetRecord creates a datastore record if it does not exist, or returns the existing one if it does
func CreateOrGetRecord(ctx context.Context, inp CreateOrGetRecordInput) (*models.Datastore, error) {
	ctx, span := telemetry.NewSpan(ctx, "create-or-get-datastore-record")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: inp.ProjectID},
		telemetry.AttributeKV{Key: "name", Value: inp.Name},
		telemetry.AttributeKV{Key: "cluster-id", Value: inp.ClusterID},
		telemetry.AttributeKV{Key: "type", Value: inp.Type},
		telemetry.AttributeKV{Key: "engine", Value: inp.Engine},
	)

	var datastore *models.Datastore
	if inp.ProjectID == 0 {
		return datastore, telemetry.Error(ctx, span, nil, "project id is 0")
	}
	if inp.Name == "" {
		return datastore, telemetry.Error(ctx, span, nil, "name is empty")
	}

	datastore, err := inp.DatastoreRepository.GetByProjectIDAndName(ctx, inp.ProjectID, inp.Name)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error reading datastore by project id and name")
	}

	if datastore != nil && datastore.ID != uuid.Nil {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-datastore-id", Value: datastore.ID})
		return datastore, nil
	}

	if inp.ClusterID == 0 {
		return datastore, telemetry.Error(ctx, span, nil, "cluster id is 0")
	}

	cluster, err := inp.ClusterRepository.ReadCluster(inp.ProjectID, inp.ClusterID)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error reading cluster")
	}

	datastoreToSave := &models.Datastore{
		ProjectID:                         inp.ProjectID,
		Name:                              inp.Name,
		Type:                              inp.Type,
		Engine:                            inp.Engine,
		CloudProvider:                     cluster.CloudProvider,
		CloudProviderCredentialIdentifier: cluster.CloudProviderCredentialIdentifier,
	}

	datastore, err = inp.DatastoreRepository.Insert(ctx, datastoreToSave)
	if err != nil {
		return datastore, telemetry.Error(ctx, span, err, "error inserting datastore")
	}

	return datastore, nil
}
