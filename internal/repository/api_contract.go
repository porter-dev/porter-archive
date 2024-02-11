package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

type APIContractRevisionFilter struct {
	ClusterID uint
	Latest    bool
}

type APIContractRevisionFilters func(*APIContractRevisionFilter)

// WithClusterID filters the APIContractRevisions by clusterID
func WithClusterID(clusterID uint) APIContractRevisionFilters {
	return func(f *APIContractRevisionFilter) {
		f.ClusterID = clusterID
	}
}

// WithLatest filters the APIContractRevisions by the latest revision
func WithLatest(latest bool) APIContractRevisionFilters {
	return func(f *APIContractRevisionFilter) {
		f.Latest = latest
	}
}

// APIContractRevisioner represents queries on the api_contracts table, which stores the all the versions of an applied API contract
type APIContractRevisioner interface {
	Insert(ctx context.Context, conf models.APIContractRevision) (models.APIContractRevision, error)
	// List returns a slice of APIContractRevision, sorted by created_at descending
	List(ctx context.Context, projectID uint, opts ...APIContractRevisionFilters) ([]*models.APIContractRevision, error)
	Get(ctx context.Context, revisionID uuid.UUID) (models.APIContractRevision, error)
	Delete(ctx context.Context, projectID uint, clusterID uint, revisionID uuid.UUID) error
}
