package repository

import (
	"github.com/porter-dev/porter/internal/models/saml"
)

type SAMLIntegrationRepository interface {
	ValidateSAMLIntegration(domain string) (*saml.SAMLIntegration, error)
}
