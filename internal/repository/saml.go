package repository

import (
	"github.com/porter-dev/porter/internal/models/saml"
)

type SAMLIntegrationRepository interface {
	ValidateSAMLIntegration(string) (*saml.SAMLIntegration, error)
	CreateSAMLIntegration(*saml.SAMLIntegration) (*saml.SAMLIntegration, error)
}
