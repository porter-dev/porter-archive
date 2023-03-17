package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

// APIContractRevisioner represents queries on the api_contracts table, which stores the all the versions of an applied API contract
type APIContractRevisioner interface {
	Insert(ctx context.Context, conf models.APIContractRevision) (models.APIContractRevision, error)
	// List returns a slice of APIContractRevision, sorted by created_at descending
	List(ctx context.Context, projectID uint, clusterID uint) ([]*models.APIContractRevision, error)
	Get(ctx context.Context, revisionID uuid.UUID) (models.APIContractRevision, error)
	Delete(ctx context.Context, projectID uint, clusterID uint, revisionID uuid.UUID) error
}
