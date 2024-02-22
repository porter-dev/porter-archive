package test

import (
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
)

type SlackIntegrationRepository struct{}

func NewSlackIntegrationRepository(canQuery bool) repository.SlackIntegrationRepository {
	return &SlackIntegrationRepository{}
}

func (s *SlackIntegrationRepository) CreateSlackIntegration(slackInt *ints.SlackIntegration) (*ints.SlackIntegration, error) {
	panic("not implemented") // TODO: Implement
}

func (s *SlackIntegrationRepository) ListSlackIntegrationsByProjectID(projectID uint) ([]*ints.SlackIntegration, error) {
	panic("not implemented") // TODO: Implement
}

func (s *SlackIntegrationRepository) DeleteSlackIntegration(integrationID uint) error {
	panic("not implemented") // TODO: Implement
}
