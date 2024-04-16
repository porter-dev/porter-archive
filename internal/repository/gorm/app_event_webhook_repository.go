package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AppEventWebhookRepository provides storage for app event webhook config
type AppEventWebhookRepository struct {
	db *gorm.DB
}

// NewAppEventWebhookRepository returns a dummy AppEventWebhookRespository
func NewAppEventWebhookRepository(db *gorm.DB) repository.AppEventWebhookRepository {
	return &AppEventWebhookRepository{db}
}

// Insert is a placeholder - actual implementation of this repository in CCP
func (repo *AppEventWebhookRepository) Insert(ctx context.Context, webhook models.AppEventWebhooks) (models.AppEventWebhooks, error) {
	return webhook, nil
}
