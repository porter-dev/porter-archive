package repository

import (
	"context"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// NeonIntegrationRepository represents the set of queries on an Neon integration
type NeonIntegrationRepository interface {
	// Insert creates a new neon integration
	Insert(ctx context.Context, neonInt ints.NeonIntegration) (ints.NeonIntegration, error)
}
