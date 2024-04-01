package models

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type NotificationConfig struct {
	gorm.Model

	Enabled bool // if notifications are enabled at all

	Success bool
	Failure bool

	LastNotifiedTime time.Time
	NotifLimit       string

	// Base64Config is a base64-encoded column that stores notification config in protobuf format
	Base64Config string `json:"base64_config" gorm:"default:''"`
}

func (conf *NotificationConfig) ToNotificationConfigType() *types.NotificationConfig {
	return &types.NotificationConfig{
		Enabled:    conf.Enabled,
		Success:    conf.Success,
		Failure:    conf.Failure,
		NotifLimit: conf.NotifLimit,
	}
}

func (conf *NotificationConfig) ShouldNotify() bool {
	// check the last notified time against the notification limit
	return conf.LastNotifiedTime.Before(notifLimitToTime(conf.NotifLimit))
}

func notifLimitToTime(notifTime string) time.Time {
	// TODO: compute a time that's not just 5 min
	return time.Now().Add(-10 * time.Minute)
}

type JobNotificationConfig struct {
	gorm.Model

	Name      string
	Namespace string

	ProjectID uint
	ClusterID uint

	LastNotifiedTime time.Time
}

func (conf *JobNotificationConfig) ShouldNotify() bool {
	// check the last notified time against the notification limit
	return conf.LastNotifiedTime.Before(time.Now().Add(-24 * time.Hour))
}
