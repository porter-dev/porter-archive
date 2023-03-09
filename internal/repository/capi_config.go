package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

// CAPIConfigRepository represents queries on the capi_configs table
type CAPIConfigRepository interface {
	Insert(ctx context.Context, conf models.CAPIConfig) (models.CAPIConfig, error)
	// List returns a slice of CAPIConfig, sorted by created_at descending
	List(ctx context.Context, projectID uint, clusterID uint) ([]models.CAPIConfig, error)
}
