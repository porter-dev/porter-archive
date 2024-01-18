package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

// AppInstanceRepository represents the set of queries on the AppInstance model
type AppInstanceRepository interface {
	// Get returns an app instance by its id
	Get(ctx context.Context, id string) (*models.AppInstance, error)
}
