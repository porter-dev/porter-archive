package integrations

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// TokenCache stores a token and an expiration for the token for a
// service account. This will never be shared over REST, so no need
// to externalize.
type TokenCache struct {
	gorm.Model

	Expiry time.Time `json:"expiry,omitempty"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	Token []byte `json:"access_token"`
}

// GetTokenCacheFunc is a function that retrieves the token and expiry
// time from the db
type GetTokenCacheFunc func(ctx context.Context) (tok *TokenCache, err error)

// SetTokenCacheFunc is a function that updates the token cache
// with a new token and expiry time
type SetTokenCacheFunc func(ctx context.Context, token string, expiry time.Time) error

// IsExpired returns true if a token is expired, false otherwise
func (t *TokenCache) IsExpired() bool {
	return time.Now().After(t.Expiry)
}

// ClusterTokenCache is a token cache that clusters can use; a foreign
// key constraint between a Cluster and ClusterTokenCache is created
type ClusterTokenCache struct {
	TokenCache

	ClusterID uint `json:"cluster_id"`
}

// RegTokenCache stores a token and an expiration for the JWT token for a
// Docker registry. This will never be shared over REST, so no need
// to externalize.
type RegTokenCache struct {
	TokenCache

	RegistryID uint `json:"registry_id"`
}

// HelmRepoTokenCache is a token cache that helm repos can use; a foreign
// key constraint between a HelmRepo and HelmRepoTokenCache is created
type HelmRepoTokenCache struct {
	TokenCache

	HelmRepoID uint `json:"helm_repo_id"`
}
