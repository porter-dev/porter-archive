package integrations

import (
	"gorm.io/gorm"
	"time"
)

// OAuthIntegrationClient is the name of an OAuth mechanism client
type OAuthIntegrationClient string

// The supported oauth mechanism clients
const (
	OAuthGithub       OAuthIntegrationClient = "github"
	OAuthDigitalOcean OAuthIntegrationClient = "do"
	OAuthGoogle       OAuthIntegrationClient = "google"
)

// SharedOAuthModel stores general fields needed for OAuth Integration
type SharedOAuthModel struct {
	// The ID issued to the client
	ClientID []byte `json:"client-id"`

	// The end-users's access token
	AccessToken []byte `json:"access-token"`

	// The end-user's refresh token
	RefreshToken []byte `json:"refresh-token"`

	// Time token expires and needs to be refreshed.
	// If 0, token will never refresh
	Expiry time.Time
}

// OAuthIntegration is an auth mechanism that uses oauth
// https://tools.ietf.org/html/rfc6749
type OAuthIntegration struct {
	gorm.Model
	SharedOAuthModel

	// The name of the auth mechanism
	Client OAuthIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------
}

// GithubAppOAuthIntegration is the model used for storing github app oauth data
// Unlike the above, this model is tied to a specific user, not a project
type GithubAppOAuthIntegration struct {
	gorm.Model
	SharedOAuthModel

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`
}

// OAuthIntegrationExternal is an OAuthIntegration to be shared over REST
type OAuthIntegrationExternal struct {
	ID uint `json:"id"`

	// The name of the auth mechanism
	Client OAuthIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`
}

// Externalize generates an external KubeIntegration to be shared over REST
func (o *OAuthIntegration) Externalize() *OAuthIntegrationExternal {
	return &OAuthIntegrationExternal{
		ID:        o.ID,
		Client:    o.Client,
		UserID:    o.UserID,
		ProjectID: o.ProjectID,
	}
}

// ToProjectIntegration converts an oauth integration to a project integration
func (o *OAuthIntegration) ToProjectIntegration(
	category string,
	service IntegrationService,
) *ProjectIntegration {
	return &ProjectIntegration{
		ID:            o.ID,
		ProjectID:     o.ProjectID,
		AuthMechanism: "oauth",
		Category:      category,
		Service:       service,
	}
}
