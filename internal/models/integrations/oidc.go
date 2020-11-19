package integrations

import "gorm.io/gorm"

// OIDCIntegrationClient is the name of an OIDC auth mechanism client
type OIDCIntegrationClient string

// The supported OIDC auth mechanism clients
const (
	OIDCKube OIDCIntegrationClient = "kube"
)

// OIDCIntegration is an auth mechanism that uses oidc. Spec:
// https://openid.net/specs/openid-connect-core-1_0.html
type OIDCIntegration struct {
	gorm.Model

	// The name of the auth mechanism
	Client OIDCIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// The "Issuer Identifier" of the OIDC spec (16.15)
	IssuerURL []byte `json:"idp-issuer-url"`

	// The ID issued to the Relying Party
	ClientID []byte `json:"client-id"`

	// The secret issued to the Relying Party
	//
	// This is present because it used to be a required field in a kubeconfig.
	// However, because the kube apiserver acts as a Relying Party, the client
	// secret is not necessary.
	ClientSecret []byte `json:"client-secret"`

	// The CA data -- certificate check must be performed (16.17)
	CertificateAuthorityData []byte `json:"idp-certificate-authority-data"`

	// The user's JWT id token
	IDToken []byte `json:"id-token"`

	// The user's refresh token
	RefreshToken []byte `json:"refresh-token"`
}

// OIDCIntegrationExternal is a OIDCIntegration to be shared over REST
type OIDCIntegrationExternal struct {
	ID uint `json:"id"`

	// The name of the auth mechanism
	Client OIDCIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`
}

// Externalize generates an external KubeIntegration to be shared over REST
func (o *OIDCIntegration) Externalize() *OIDCIntegrationExternal {
	return &OIDCIntegrationExternal{
		ID:        o.ID,
		Client:    o.Client,
		UserID:    o.UserID,
		ProjectID: o.ProjectID,
	}
}
