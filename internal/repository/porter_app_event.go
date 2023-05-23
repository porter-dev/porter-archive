package repository

import (
	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

// PorterAppEventRepository represents the set of queries on the PorterAppEvent model
type PorterAppEventRepository interface {
	ListEventsByPorterAppID(porterAppID uint) ([]*models.PorterAppEvent, error)
	EventByID(eventID uuid.UUID) (*models.PorterAppEvent, error)
}
