package gorm

import (
	"github.com/porter-dev/porter/internal/models/saml"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// SAMLIntegrationRepository uses gorm.DB for querying the database
type SAMLIntegrationRepository struct {
	db *gorm.DB
}

// NewSAMLIntegrationRepository returns a SAMLIntegrationRepository which uses
// gorm.DB for querying the database
func NewSAMLIntegrationRepository(db *gorm.DB) repository.SAMLIntegrationRepository {
	return &SAMLIntegrationRepository{db}
}

func (repo *SAMLIntegrationRepository) ValidateSAMLIntegration(domain string) (*saml.SAMLIntegration, error) {
	integ := &saml.SAMLIntegration{}

	if err := repo.db.Raw(
		"SELECT * FROM saml_integrations WHERE ? = ANY (string_to_array(saml_integrations.domains, ','))", domain).
		First(integ).Error; err != nil {
		return nil, err
	}

	return integ, nil
}
