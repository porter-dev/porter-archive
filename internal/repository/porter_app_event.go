package repository

import (
	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
)

// PorterAppEventRepository represents the set of queries on the PorterAppEvent model
type PorterAppEventRepository interface {
	ListEventsByPorterAppID(porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error)
	EventByID(eventID uuid.UUID) (*models.PorterAppEvent, error)
}
