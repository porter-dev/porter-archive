package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
)

// PorterAppEventRepository represents the set of queries on the PorterAppEvent model
type PorterAppEventRepository interface {
	ListEventsByPorterAppID(ctx context.Context, porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error)
	ListEventsByPorterAppIDAndDeploymentTargetID(ctx context.Context, porterAppID uint, deploymentTargetID uuid.UUID, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error)
	CreateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error
	UpdateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error
	ReadEvent(ctx context.Context, id uuid.UUID) (models.PorterAppEvent, error)
	ReadDeployEventByRevision(ctx context.Context, porterAppID uint, revision float64) (models.PorterAppEvent, error)
	ReadDeployEventByAppRevisionID(ctx context.Context, porterAppID uint, appRevisionID string) (models.PorterAppEvent, error)
}
