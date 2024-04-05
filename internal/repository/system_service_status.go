package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

// SystemServiceStatusRepository represents the set of queries on the SystemServiceStatus model
type SystemServiceStatusRepository interface {
	ReadSystemServiceStatus(ctx context.Context, id uuid.UUID) (models.SystemServiceStatus, error)
}
