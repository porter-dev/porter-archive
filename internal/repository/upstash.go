package repository

import (
	"context"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// UpstashIntegrationRepository represents the set of queries on an Upstash integration
type UpstashIntegrationRepository interface {
	// Insert creates a new upstash integration
	Insert(ctx context.Context, upstashInt ints.UpstashIntegration) (ints.UpstashIntegration, error)
}
