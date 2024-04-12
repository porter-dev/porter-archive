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

func (repo *AppEventWebhookRepository) Insert(context.Context, models.AppEventWebhook) (models.AppEventWebhook, error) {
	return models.AppEventWebhook{}, errors.New("cannot read database")
}
