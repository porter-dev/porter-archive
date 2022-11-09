package models

import "gorm.io/gorm"

type DbMigration struct {
	gorm.Model

	Version uint
}
