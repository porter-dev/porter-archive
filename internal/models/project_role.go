package models

import (
	"gorm.io/gorm"
)

type ProjectRole struct {
	gorm.Model

	ProjectID uint
	PolicyID  uint

	UniqueID string `gorm:"unique"`

	Name string

	Users []User `gorm:"many2many:user_roles"`
}
