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
