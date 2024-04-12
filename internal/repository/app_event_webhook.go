package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

type AppEventWebhookRepository interface {
	Insert(ctx context.Context, webhook models.AppEventWebhook) (models.AppEventWebhook, error)
}
