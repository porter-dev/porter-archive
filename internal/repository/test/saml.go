package test

import (
	"github.com/porter-dev/porter/internal/models/saml"
	"github.com/porter-dev/porter/internal/repository"
)

// SAMLIntegrationRepository implements repository.SAMLIntegrationRepository
type SAMLIntegrationRepository struct {
	canQuery     bool
	integrations []*saml.SAMLIntegration
}

// NewSAMLIntegrationRepository will return errors if canQuery is false
func NewSAMLIntegrationRepository(canQuery bool) repository.SAMLIntegrationRepository {
	return &SAMLIntegrationRepository{
		canQuery,
		[]*saml.SAMLIntegration{},
	}
}

func (repo *SAMLIntegrationRepository) ValidateSAMLIntegration(domain string) (*saml.SAMLIntegration, error) {
	integ := &saml.SAMLIntegration{}

	// TODO: fix test query

	return integ, nil
}

func (repo *SAMLIntegrationRepository) CreateSAMLIntegration(integ *saml.SAMLIntegration) (*saml.SAMLIntegration, error) {
	repo.integrations = append(repo.integrations, integ)

	return integ, nil
}
