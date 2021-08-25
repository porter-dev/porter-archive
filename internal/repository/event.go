package repository

import "github.com/porter-dev/porter/internal/models"

type EventRepository interface {
	CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error)
	CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error)
}
