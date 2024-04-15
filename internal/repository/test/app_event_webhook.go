package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type AppEventWebhookRepository struct {
	canQuery bool
}

func NewAppEventWebhookRepository(canQuery bool, failingMethods ...string) repository.AppEventWebhookRepository {
	return &AppEventWebhookRepository{canQuery: false}
}

func (repo *AppEventWebhookRepository) Insert(context.Context, models.AppEventWebhooks) (models.AppEventWebhooks, error) {
	return models.AppEventWebhooks{}, errors.New("cannot read database")
}
