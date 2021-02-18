package models

import (
	"time"

	"gorm.io/gorm"
)

// AuthCode type that extends gorm.Model
type AuthCode struct {
	gorm.Model

	Token             string `gorm:"unique"`
	AuthorizationCode string `gorm:"unique"`
	Expiry            *time.Time
}

func (a *AuthCode) IsExpired() bool {
	timeLeft := a.Expiry.Sub(time.Now())
	return timeLeft < 0
}
