package models

import "gorm.io/gorm"

type NotificationConfig struct {
	gorm.Model

	Enabled bool `gorm:"default:true"` // if notifications are enabled at all

	Deploy  bool `gorm:"default:true"` // for specific events
	Success bool `gorm:"default:true"`
	Failure bool `gorm:"default:true"`
}

type NotificationConfigExternal struct {
	Enabled bool `json:"enabled"`
	Deploy  bool `json:"deploy"`
	Success bool `json:"success"`
	Failure bool `json:"failure"`
}
