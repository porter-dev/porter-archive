package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AppEvetnWebhookRespostiory provides storage for app event webhook config
type AppEventWebhookRepository struct {
	db *gorm.DB
}

// NewAppEventWebhookRespository returns a dummy AppEventWebhookRespository
func NewAppEventWebhookRepository(db *gorm.DB) repository.AppEventWebhookRepository {
	return &AppEventWebhookRepository{db}
}

// Insert is a placeholder - actual implementation of this repository in CCP
func (repo *AppEventWebhookRepository) Insert(ctx context.Context, webhook models.AppEventWebhook) (models.AppEventWebhook, error) {
	return webhook, nil
}
