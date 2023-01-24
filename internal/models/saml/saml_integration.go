package saml

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type SAMLIntegration struct {
	gorm.Model

	ProjectID uint

	Domains         string
	Type            types.IDPType
	SignOnURL       string
	CertificateData []byte
}
