package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

type NotificationConfigRepository interface {
	CreateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error)
	ReadNotificationConfig(id uint) (*models.NotificationConfig, error)
	UpdateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error)
}
