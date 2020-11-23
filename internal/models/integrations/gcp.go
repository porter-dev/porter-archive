package integrations

import (
	"context"

	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

// GCPIntegration is an auth mechanism that uses a GCP service account to
// authenticate
type GCPIntegration struct {
	gorm.Model

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The GCP project id where the service account for this auth mechanism persists
	GCPProjectID string `json:"gcp-project-id"`

	// The GCP user email that linked this service account
	GCPUserEmail string `json:"gcp-user-email"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// KeyData for a service account for GCP connectors
	GCPKeyData []byte `json:"gcp_key_data"`
}

// GCPIntegrationExternal is a GCPIntegration to be shared over REST
type GCPIntegrationExternal struct {
	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The GCP project id where the service account for this auth mechanism persists
	GCPProjectID string `json:"gcp-project-id"`

	// The GCP user email that linked this service account
	GCPUserEmail string `json:"gcp-user-email"`
}

// Externalize generates an external KubeIntegration to be shared over REST
func (g *GCPIntegration) Externalize() *GCPIntegrationExternal {
	return &GCPIntegrationExternal{
		ID:           g.ID,
		UserID:       g.UserID,
		ProjectID:    g.ProjectID,
		GCPProjectID: g.GCPProjectID,
		GCPUserEmail: g.GCPUserEmail,
	}
}

// ToProjectIntegration converts a gcp integration to a project integration
func (g *GCPIntegration) ToProjectIntegration(
	category string,
	service IntegrationService,
) *ProjectIntegration {
	return &ProjectIntegration{
		ID:            g.ID,
		ProjectID:     g.ProjectID,
		AuthMechanism: "gcp",
		Category:      category,
		Service:       service,
	}
}

// GetBearerToken retrieves a bearer token for a GCP account
func (g *GCPIntegration) GetBearerToken(
	getTokenCache GetTokenCacheFunc,
	setTokenCache SetTokenCacheFunc,
) (string, error) {
	cache, err := getTokenCache()

	// check the token cache for a non-expired token
	if tok := cache.Token; err == nil && !cache.IsExpired() && len(tok) > 0 {
		return string(tok), nil
	}

	creds, err := google.CredentialsFromJSON(
		context.Background(),
		g.GCPKeyData,
		"https://www.googleapis.com/auth/cloud-platform",
	)

	if err != nil {
		return "", err
	}

	tok, err := creds.TokenSource.Token()

	if err != nil {
		return "", err
	}

	// update the token cache
	setTokenCache(tok.AccessToken, tok.Expiry)

	return tok.AccessToken, nil
}
