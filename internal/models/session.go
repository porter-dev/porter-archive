package models

import (
	"time"

	"github.com/jinzhu/gorm"
)

// Session type that extends gorm.Model.
type Session struct {
	gorm.Model
	// Session ID
	Key string
	// encrypted cookie
	Data []byte
	// Time the session will expire
	ExpiresAt time.Time
}
