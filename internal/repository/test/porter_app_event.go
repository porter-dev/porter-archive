package test

import (
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

func (repo *PorterAppEventRepository) ListEventsByPorterAppID(porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	return nil, helpers.PaginatedResult{}, errors.New("cannot write database")
}

func (repo *PorterAppEventRepository) EventByID(eventID uuid.UUID) (*models.PorterAppEvent, error) {
	return &models.PorterAppEvent{}, errors.New("cannot write database")
}
