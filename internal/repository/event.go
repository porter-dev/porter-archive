package repository

import "github.com/porter-dev/porter/internal/models"

type EventRepository interface {
	CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error)
	CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error)
	ReadEventsByContainerID(id uint) ([]*models.SubEvent, error)
	ReadEventContainer(id uint) (*models.EventContainer, error)
	ReadSubEvent(id uint) (*models.SubEvent, error)
	AppendEvent(container *models.EventContainer, event *models.SubEvent) error
}
