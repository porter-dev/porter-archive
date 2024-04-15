package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

// AppEventWebhookRepository provides storage for app event webhook config
type AppEventWebhookRepository interface {
	Insert(ctx context.Context, webhook models.AppEventWebhooks) (models.AppEventWebhooks, error)
}
