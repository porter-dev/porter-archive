package test

import (
	"context"

	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
)

type UpstashIntegrationRepository struct{}

func NewUpstashIntegrationRepository(canQuery bool) repository.UpstashIntegrationRepository {
	return &UpstashIntegrationRepository{}
}

func (s *UpstashIntegrationRepository) Insert(ctx context.Context, upstashInt ints.UpstashIntegration) (ints.UpstashIntegration, error) {
	panic("not implemented") // TODO: Implement
}

func (s *UpstashIntegrationRepository) Integrations(ctx context.Context, projectID uint) ([]ints.UpstashIntegration, error) {
	panic("not implemented") // TODO: Implement
}
