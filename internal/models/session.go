package models

import (
	"time"

	"gorm.io/gorm"
)

// Session type that extends gorm.Model.
type Session struct {
	gorm.Model
	// Session ID
	Key string `gorm:"unique"`
	// encrypted cookie
	Data []byte
	// Time the session will expire
	ExpiresAt time.Time
}
