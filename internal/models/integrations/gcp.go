package integrations

import (
	"context"
	"encoding/json"

	"github.com/porter-dev/porter/api/types"

	"golang.org/x/oauth2"
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
	GCPProjectID string `json:"gcp_project_id"`

	// The GCP service account email for this credential
	GCPSAEmail string `json:"gcp_sa_email"`

	// The GCP user email that linked this service account
	GCPUserEmail string `json:"gcp-user-email"`

	// The GCP region, which may or may not be used by the integration
	GCPRegion string `json:"gcp_region"`

	// ------------------------------------------------------------------
	// All fields encrypted before storage.
	// ------------------------------------------------------------------

	// KeyData for a service account for GCP connectors
	GCPKeyData []byte `json:"gcp_key_data"`
}

func (g *GCPIntegration) ToGCPIntegrationType() *types.GCPIntegration {
	return &types.GCPIntegration{
		ID:           g.ID,
		UserID:       g.UserID,
		ProjectID:    g.ProjectID,
		GCPProjectID: g.GCPProjectID,
		GCPSAEmail:   g.GCPSAEmail,
	}
}

// GetBearerToken retrieves a bearer token for a GCP account
func (g *GCPIntegration) GetBearerToken(
	getTokenCache GetTokenCacheFunc,
	setTokenCache SetTokenCacheFunc,
	scopes ...string,
) (*oauth2.Token, error) {
	cache, err := getTokenCache()

	// check the token cache for a non-expired token
	if cache != nil {
		if tok := cache.Token; err == nil && !cache.IsExpired() && len(tok) > 0 {
			return &oauth2.Token{
				AccessToken: string(cache.Token),
				Expiry:      cache.Expiry,
			}, nil
		}
	}

	creds, err := google.CredentialsFromJSON(
		context.Background(),
		g.GCPKeyData,
		scopes...,
	)

	if err != nil {
		return nil, err
	}

	tok, err := creds.TokenSource.Token()

	if err != nil {
		return nil, err
	}

	// update the token cache
	setTokenCache(tok.AccessToken, tok.Expiry)

	return tok, nil
}

// credentialsFile is the unmarshalled representation of a GCP credentials file.
// Source; golang.org/x/oauth2/google
type credentialsFile struct {
	Type string `json:"type"` // serviceAccountKey or userCredentialsKey

	// Service Account fields
	ClientEmail  string `json:"client_email"`
	PrivateKeyID string `json:"private_key_id"`
	PrivateKey   string `json:"private_key"`
	TokenURL     string `json:"token_uri"`
	ProjectID    string `json:"project_id"`

	// User Credential fields
	// (These typically come from gcloud auth.)
	ClientSecret string `json:"client_secret"`
	ClientID     string `json:"client_id"`
	RefreshToken string `json:"refresh_token"`

	// External Account fields
	Audience                       string `json:"audience"`
	SubjectTokenType               string `json:"subject_token_type"`
	TokenURLExternal               string `json:"token_url"`
	TokenInfoURL                   string `json:"token_info_url"`
	ServiceAccountImpersonationURL string `json:"service_account_impersonation_url"`
	// CredentialSource               externalaccount.CredentialSource `json:"credential_source"`
	QuotaProjectID string `json:"quota_project_id"`
}

func GCPProjectIDFromJSON(jsonData []byte) (string, error) {
	var f credentialsFile
	if err := json.Unmarshal(jsonData, &f); err != nil {
		return "", err
	}

	return f.ProjectID, nil
}

// PopulateGCPMetadata uses the credentials file to get the GCP SA name and
// project ID, and attaches it to the GCP credential
func (g *GCPIntegration) PopulateGCPMetadata() {
	var f credentialsFile

	if err := json.Unmarshal(g.GCPKeyData, &f); err != nil {
		return
	}

	g.GCPProjectID = f.ProjectID
	g.GCPSAEmail = f.ClientEmail
}
