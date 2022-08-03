package models

import (
	"gorm.io/gorm"
)

type ProjectRole struct {
	gorm.Model

	ProjectID uint `gorm:"not null;check:project_id>0"`
	PolicyID  uint `gorm:"not null;check:policy_id>0"`

	UniqueID string `gorm:"unique"`

	Name string `gorm:"not null;check:name!=''"`

	Users []User
}
