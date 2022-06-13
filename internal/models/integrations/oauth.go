package integrations

import (
	"context"
	"time"

	"github.com/digitalocean/godo"
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

	// (optional) an identifying email on the target identity provider.
	// for example, for DigitalOcean this is the user's email.
	TargetEmail string `json:"target_email"`

	// (optional) an identifying string on the target identity provider.
	// for example, for DigitalOcean this is the target project name.
	TargetName string `json:"target_id"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------
}

func (g *OAuthIntegration) PopulateTargetMetadata() {
	switch g.Client {
	case types.OAuthDigitalOcean:
		client := godo.NewFromToken(string(g.AccessToken))

		account, _, err := client.Account.Get(context.TODO())

		if err == nil && account != nil {
			g.TargetEmail = account.Email
		}

		proj, _, err := client.Projects.GetDefault(context.TODO())

		if err == nil && proj != nil {
			g.TargetName = proj.Name
		}
	}
}

// ToOAuthIntegrationType generates an external OAuthIntegration to be shared over REST
func (o *OAuthIntegration) ToOAuthIntegrationType() *types.OAuthIntegration {
	return &types.OAuthIntegration{
		CreatedAt:   o.CreatedAt,
		ID:          o.ID,
		Client:      o.Client,
		UserID:      o.UserID,
		ProjectID:   o.ProjectID,
		TargetEmail: o.TargetEmail,
		TargetName:  o.TargetName,
	}
}

// GithubAppOAuthIntegration is the model used for storing github app oauth data
// Unlike the above, this model is tied to a specific user, not a project
type GithubAppOAuthIntegration struct {
	gorm.Model
	SharedOAuthModel

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`
}

// GitlabAppOAuthIntegration is the model used for storing gitlab app oauth data
type GitlabAppOAuthIntegration struct {
	gorm.Model

	// The ID of the oauth integration linked with this auth mechanism
	OAuthIntegrationID uint `json:"oauth_integration_id"`

	// The ID of the gitlab integration linked with this auth mechanism
	GitlabIntegrationID uint `json:"gitlab_integration_id"`
}
