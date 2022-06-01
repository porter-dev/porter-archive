package models

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type APIToken struct {
	gorm.Model

	UniqueID string `gorm:"unique"`

	ProjectID       uint
	CreatedByUserID uint
	Expiry          *time.Time
	Revoked         bool
	PolicyUID       string
	PolicyName      string
	Name            string

	// SecretKey is hashed like a password before storage
	SecretKey []byte
}

func (p *APIToken) IsExpired() bool {
	timeLeft := p.Expiry.Sub(time.Now())
	return timeLeft < 0
}

func (p *APIToken) ToAPITokenMetaType() *types.APITokenMeta {
	return &types.APITokenMeta{
		ID:         p.UniqueID,
		CreatedAt:  p.CreatedAt,
		ExpiresAt:  *p.Expiry,
		PolicyName: p.PolicyName,
		PolicyUID:  p.PolicyUID,
		Name:       p.Name,
	}
}

func (p *APIToken) ToAPITokenType(policy []*types.PolicyDocument, token string) *types.APIToken {
	return &types.APIToken{
		APITokenMeta: p.ToAPITokenMetaType(),
		Policy:       policy,
		Token:        token,
	}
}
