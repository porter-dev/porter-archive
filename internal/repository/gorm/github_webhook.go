package gorm

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

// GithubWebhookRepository uses gorm.DB for querying the database
type GithubWebhookRepository struct {
	db *gorm.DB
}

// NewGithubWebhookRepository returns a GithubWebhookRepository which uses
// gorm.DB for querying the database
func NewGithubWebhookRepository(db *gorm.DB) repository.GithubWebhookRepository {
	return &GithubWebhookRepository{db}
}

// Insert inserts a new GithubWebhook into the db
func (repo *GithubWebhookRepository) Insert(ctx context.Context, webhook *models.GithubWebhook) (*models.GithubWebhook, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-insert-github-webhook")
	defer span.End()

	if webhook == nil {
		return nil, telemetry.Error(ctx, span, nil, "github webhook is nil")
	}
	if webhook.ClusterID == 0 {
		return nil, telemetry.Error(ctx, span, nil, "cluster id is empty")
	}
	if webhook.ProjectID == 0 {
		return nil, telemetry.Error(ctx, span, nil, "project id is empty")
	}
	if webhook.PorterAppID == 0 {
		return nil, telemetry.Error(ctx, span, nil, "porter app id is empty")
	}

	if webhook.ID == uuid.Nil {
		webhook.ID = uuid.New()
	}
	if webhook.CreatedAt.IsZero() {
		webhook.CreatedAt = time.Now().UTC()
	}
	if webhook.UpdatedAt.IsZero() {
		webhook.UpdatedAt = time.Now().UTC()
	}

	if err := repo.db.Save(webhook).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error saving webhook")
	}

	return webhook, nil
}

// GetByClusterAndAppID finds a GithubWebhook by clusterID and appID
func (repo *GithubWebhookRepository) GetByClusterAndAppID(ctx context.Context, clusterID uint, appID uint) (*models.GithubWebhook, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-get-github-webhook")
	defer span.End()

	webhook := &models.GithubWebhook{}

	if err := repo.db.Where("cluster_id = ? AND porter_app_id = ?", clusterID, appID).Limit(1).Find(&webhook).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error finding webhook")
	}

	return webhook, nil
}

// Get finds a GithubWebhook by id
func (repo *GithubWebhookRepository) Get(ctx context.Context, id uuid.UUID) (*models.GithubWebhook, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-get-github-webhook")
	defer span.End()

	webhook := &models.GithubWebhook{}

	if err := repo.db.Where("id = ?", id).Limit(1).Find(&webhook).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error finding webhook")
	}

	return webhook, nil
}
