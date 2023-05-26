package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
)

// PorterAppEventRepository represents the set of queries on the PorterAppEvent model
type PorterAppEventRepository interface {
	ListEventsByPorterAppID(ctx context.Context, porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error)
	CreateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error
}
