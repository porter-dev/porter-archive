package models

import "gorm.io/gorm"

type NotificationConfig struct {
	gorm.Model

	Enabled bool `gorm:"default:true"` // if notifications are enabled at all

	Success bool `gorm:"default:true"`
	Failure bool `gorm:"default:true"`
}

type NotificationConfigExternal struct {
	Enabled bool `json:"enabled"`
	Success bool `json:"success"`
	Failure bool `json:"failure"`
}

func (conf *NotificationConfig) Externalize() *NotificationConfigExternal {
	return &NotificationConfigExternal{
		Enabled: conf.Enabled,
		Success: conf.Success,
		Failure: conf.Failure,
	}
}
