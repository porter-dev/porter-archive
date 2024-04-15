package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AppEventWebhookRepository is a test repository for AppEventWebhooks
type AppEventWebhookRepository struct {
	canQuery bool
}

// NewAppEventWebhookRepository returns a new AppEventWebhookRepository
func NewAppEventWebhookRepository(canQuery bool, failingMethods ...string) repository.AppEventWebhookRepository {
	return &AppEventWebhookRepository{canQuery: false}
}

// Insert is a placeholder - actual implementation of this repository in CCP
func (repo *AppEventWebhookRepository) Insert(context.Context, models.AppEventWebhooks) (models.AppEventWebhooks, error) {
	return models.AppEventWebhooks{}, errors.New("cannot read database")
}
