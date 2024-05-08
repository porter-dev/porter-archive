package repository

import (
	"context"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// NeonIntegrationRepository represents the set of queries on an Neon integration
type NeonIntegrationRepository interface {
	// Insert creates a new neon integration
	Insert(ctx context.Context, neonInt ints.NeonIntegration) (ints.NeonIntegration, error)
	// Integrations returns all neon integrations for a given project
	Integrations(ctx context.Context, projectID uint) ([]ints.NeonIntegration, error)
}
