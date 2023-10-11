package test

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// GithubWebhookRepository is a test repository that implements repository.GithubWebhookRepository
type GithubWebhookRepository struct {
	canQuery bool
}

// NewGithubWebhookRepository returns the test GithubWebhookRepository
func NewGithubWebhookRepository() repository.GithubWebhookRepository {
	return &GithubWebhookRepository{canQuery: false}
}

// Insert inserts a new GithubWebhook into the db
func (repo *GithubWebhookRepository) Insert(ctx context.Context, webhook *models.GithubWebhook) (*models.GithubWebhook, error) {
	return nil, errors.New("cannot write database")
}

// GetByClusterAndAppID finds a GithubWebhook by clusterID and appID
func (repo *GithubWebhookRepository) GetByClusterAndAppID(ctx context.Context, clusterID, appID uint) (*models.GithubWebhook, error) {
	return nil, errors.New("cannot read database")
}

// Get finds a GithubWebhook by id
func (repo *GithubWebhookRepository) Get(ctx context.Context, id uuid.UUID) (*models.GithubWebhook, error) {
	return nil, errors.New("cannot read database")
}
