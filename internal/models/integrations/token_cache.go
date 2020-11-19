package integrations

import (
	"time"

	"gorm.io/gorm"
)

// GetTokenCacheFunc is a function that retrieves the token and expiry
// time from the db
type GetTokenCacheFunc func() (tok *TokenCache, err error)

// SetTokenCacheFunc is a function that updates the token cache
// with a new token and expiry time
type SetTokenCacheFunc func(token string, expiry time.Time) error

// TokenCache stores a token and an expiration for the token for a
// service account. This will never be shared over REST, so no need
// to externalize.
type TokenCache struct {
	gorm.Model

	ClusterID uint      `json:"cluster_id"`
	Expiry    time.Time `json:"expiry,omitempty"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	Token []byte `json:"access_token"`
}

// IsExpired returns true if a token is expired, false otherwise
func (t *TokenCache) IsExpired() bool {
	return time.Now().After(t.Expiry)
}
