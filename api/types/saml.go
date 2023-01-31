package types

type IDPType string

const (
	IDPTypeOkta IDPType = "okta"
)

type ValidateSAMLRequest struct {
	Email string `json:"email" form:"required,email"`
}

type CreateSAMLIntegrationRequest struct {
	Domains         []string `json:"domains" form:"required"`
	Type            IDPType  `json:"type" form:"required,oneof=okta"`
	SignOnURL       string   `json:"sign_on_url" form:"required,url"`
	CertificateData string   `json:"certificate_data" form:"required"`
}
