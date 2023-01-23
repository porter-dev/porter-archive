package saml

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type SAMLIntegration struct {
	gorm.Model

	Domains       string
	IntegrationID uint
	Type          types.IDPType
	SignOnURL     string
}
