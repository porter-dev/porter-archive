package models

import (
	"gorm.io/gorm"
)

// Allowlist is a simple list with all the users emails allowed to create new projects
type Allowlist struct {
	gorm.Model

	UserEmail string `json:"user_email" gorm:"unique;not null"`
}
