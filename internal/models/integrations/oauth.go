package integrations

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
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
	Client types.OAuthIntegrationClient `json:"client"`

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

// ToOAuthIntegrationType generates an external OAuthIntegration to be shared over REST
func (o *OAuthIntegration) ToOAuthIntegrationType() *types.OAuthIntegration {
	return &types.OAuthIntegration{
		ID:        o.ID,
		Client:    o.Client,
		UserID:    o.UserID,
		ProjectID: o.ProjectID,
	}
}
