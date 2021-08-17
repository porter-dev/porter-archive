package models

import "gorm.io/gorm"

type NotificationConfig struct {
	gorm.Model

	Enabled bool // if notifications are enabled at all

	Success bool
	Failure bool
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
