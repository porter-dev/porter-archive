package models

import (
	"time"

	"gorm.io/gorm"
)

// PWResetToken type that extends gorm.Model
type PWResetToken struct {
	gorm.Model

	Email   string
	IsValid bool
	Expiry  *time.Time

	// Token is hashed like a password before storage
	Token string
}

func (p *PWResetToken) IsExpired() bool {
	timeLeft := p.Expiry.Sub(time.Now())
	return timeLeft < 0
}
