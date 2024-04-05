package test

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type SystemServiceStatusRepistory struct {
	canQuery bool
}

func NewSystemServiceStatusRepository(canQuery bool, failingMethods ...string) repository.SystemServiceStatusRepository {
	return &SystemServiceStatusRepistory{canQuery: false}
}

func (repo *SystemServiceStatusRepistory) ReadSystemServiceStatus(ctx context.Context, id uuid.UUID) (models.SystemServiceStatus, error) {
	return models.SystemServiceStatus{}, errors.New("cannot read database")
}
