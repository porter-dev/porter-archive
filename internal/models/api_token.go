package models

import (
	"time"

	"gorm.io/gorm"
)

type APIToken struct {
	gorm.Model

	UniqueID string `gorm:"unique"`

	ProjectID       uint
	CreatedByUserID uint
	Expiry          *time.Time
	Revoked         bool
	PolicyName      string

	// SecretKey is hashed like a password before storage
	SecretKey string
}

func (p *APIToken) IsExpired() bool {
	timeLeft := p.Expiry.Sub(time.Now())
	return timeLeft < 0
}
