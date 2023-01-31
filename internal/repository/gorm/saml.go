package gorm

import (
	"github.com/porter-dev/porter/internal/models/saml"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/credentials"
	"gorm.io/gorm"
)

// SAMLIntegrationRepository uses gorm.DB for querying the database
type SAMLIntegrationRepository struct {
	db             *gorm.DB
	key            *[32]byte
	storageBackend credentials.CredentialStorage
}

// NewSAMLIntegrationRepository returns a SAMLIntegrationRepository which uses
// gorm.DB for querying the database
func NewSAMLIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
	storageBackend credentials.CredentialStorage,
) repository.SAMLIntegrationRepository {
	return &SAMLIntegrationRepository{db, key, storageBackend}
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

func (repo *SAMLIntegrationRepository) CreateSAMLIntegration(integ *saml.SAMLIntegration) (*saml.SAMLIntegration, error) {
	if err := repo.db.Create(integ).Error; err != nil {
		return nil, err
	}

	return nil, nil
}
