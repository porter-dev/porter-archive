package models

import (
	"gorm.io/gorm"
)

type ProjectRole struct {
	gorm.Model

	ProjectID uint

	UniqueID string `gorm:"unique"`

	Name string

	Policies []Policy `gorm:"many2many:role_policies"`
	Users    []User   `gorm:"many2many:user_roles"`
}
