package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

type NotificationConfigRepository interface {
	CreateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error)
	ReadNotificationConfig(id uint) (*models.NotificationConfig, error)
	UpdateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error)
}

type JobNotificationConfigRepository interface {
	CreateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error)
	ReadNotificationConfig(projID, clusterID uint, name, namespace string) (*models.JobNotificationConfig, error)
	UpdateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error)
}
