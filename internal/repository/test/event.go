package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type EventRepository struct{}

func NewEventRepository(canQuery bool) repository.EventRepository {
	return &EventRepository{}
}

func (n *EventRepository) CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error) {
	panic("not implemented") // TODO: Implement
}

func (n *EventRepository) CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *EventRepository) ReadEventsByContainerID(id uint) ([]*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *EventRepository) ReadEventContainer(id uint) (*models.EventContainer, error) {
	panic("not implemented") // TODO: Implement
}

func (n *EventRepository) ReadSubEvent(id uint) (*models.SubEvent, error) {
	panic("not implemented") // TODO: Implement
}

func (n *EventRepository) AppendEvent(container *models.EventContainer, event *models.SubEvent) error {
	panic("not implemented") // TODO: Implement
}
