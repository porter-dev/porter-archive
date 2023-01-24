package test

import (
	"strings"

	"github.com/porter-dev/porter/internal/models/saml"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
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
	for _, integ := range repo.integrations {
		for _, d := range strings.Split(integ.Domains, ",") {
			if d == domain {
				return integ, nil
			}
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (repo *SAMLIntegrationRepository) CreateSAMLIntegration(integ *saml.SAMLIntegration) (*saml.SAMLIntegration, error) {
	repo.integrations = append(repo.integrations, integ)

	return integ, nil
}
