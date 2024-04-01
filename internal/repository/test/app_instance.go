package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AppInstanceRepository is a test repository that implements repository.AppInstanceRepository
type AppInstanceRepository struct {
	canQuery bool
}

// NewAppInstanceRepository returns the test AppInstanceRepository
func NewAppInstanceRepository() repository.AppInstanceRepository {
	return &AppInstanceRepository{canQuery: false}
}

// Get returns an app instance by its id
func (repo *AppInstanceRepository) Get(ctx context.Context, id string) (*models.AppInstance, error) {
	return nil, errors.New("cannot read database")
}
