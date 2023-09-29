package test

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
)

type PorterAppEventRepository struct {
	canQuery bool
}

func NewPorterAppEventRepository(canQuery bool, failingMethods ...string) repository.PorterAppEventRepository {
	return &PorterAppEventRepository{canQuery: false}
}

func (repo *PorterAppEventRepository) ListEventsByPorterAppID(ctx context.Context, porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	return nil, helpers.PaginatedResult{}, errors.New("cannot write database")
}

// ListEventsByPorterAppIDAndDeploymentTargetID is a test method
func (repo *PorterAppEventRepository) ListEventsByPorterAppIDAndDeploymentTargetID(ctx context.Context, porterAppID uint, deploymentTargetID uuid.UUID, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	return nil, helpers.PaginatedResult{}, errors.New("cannot write database")
}

func (repo *PorterAppEventRepository) CreateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error {
	return errors.New("cannot write database")
}

func (repo *PorterAppEventRepository) UpdateEvent(ctx context.Context, appEvent *models.PorterAppEvent) error {
	return errors.New("cannot update database")
}

func (repo *PorterAppEventRepository) ReadEvent(ctx context.Context, id uuid.UUID) (models.PorterAppEvent, error) {
	return models.PorterAppEvent{}, errors.New("cannot read database")
}

func (repo *PorterAppEventRepository) ReadDeployEventByRevision(ctx context.Context, porterAppID uint, revision float64) (models.PorterAppEvent, error) {
	return models.PorterAppEvent{}, errors.New("cannot read database")
}

// ReadDeployEventByAppRevisionID is a test method
func (repo *PorterAppEventRepository) ReadDeployEventByAppRevisionID(ctx context.Context, porterAppID uint, appRevisionID string) (models.PorterAppEvent, error) {
	return models.PorterAppEvent{}, errors.New("cannot read database")
}
