package models

import (
	"time"

	"gorm.io/gorm"
)

// TokenCache stores a token and an expiration for the token for a
// service account. This will never be shared over REST, so no need
// to externalize.
type TokenCache struct {
	gorm.Model

	ServiceAccountID uint      `json:"service_account_id"`
	Expiry           time.Time `json:"expiry,omitempty"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------

	Token []byte `json:"access_token"`
}

// IsExpired returns true if a token is expired, false otherwise
func (t *TokenCache) IsExpired() bool {
	return time.Now().After(t.Expiry)
}
