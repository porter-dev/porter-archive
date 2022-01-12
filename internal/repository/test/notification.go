package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type NotificationConfigRepository struct{}

func NewNotificationConfigRepository(canQuery bool) repository.NotificationConfigRepository {
	return &NotificationConfigRepository{}
}

func (n *NotificationConfigRepository) CreateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}

func (n *NotificationConfigRepository) ReadNotificationConfig(id uint) (*models.NotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}

func (n *NotificationConfigRepository) UpdateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}

type JobNotificationConfigRepository struct{}

func NewJobNotificationConfigRepository(canQuery bool) repository.JobNotificationConfigRepository {
	return &JobNotificationConfigRepository{}
}

func (n *JobNotificationConfigRepository) CreateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}

func (n *JobNotificationConfigRepository) ReadNotificationConfig(projID, clusterID uint, name, namespace string) (*models.JobNotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}

func (n *JobNotificationConfigRepository) UpdateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error) {
	panic("not implemented") // TODO: Implement
}
