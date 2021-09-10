package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type NotificationConfig struct {
	gorm.Model

	Enabled bool // if notifications are enabled at all

	Success bool
	Failure bool
}

func (conf *NotificationConfig) ToNotificationConfigType() *types.NotificationConfig {
	return &types.NotificationConfig{
		Enabled: conf.Enabled,
		Success: conf.Success,
		Failure: conf.Failure,
	}
}
