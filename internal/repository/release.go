package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// WriteRelease is the function type for all Release write operations
type WriteRelease func(release *models.Release) (*models.Release, error)

// ReleaseRepository represents the set of queries on the Release model
type ReleaseRepository interface {
	CreateRelease(release *models.Release) (*models.Release, error)
	ReadRelease(clusterID uint, name, namespace string) (*models.Release, error)
	ReadReleaseByWebhookToken(token string) (*models.Release, error)
	ListReleasesByImageRepoURI(clusterID uint, imageRepoURI string) ([]*models.Release, error)
	UpdateRelease(release *models.Release) (*models.Release, error)
	DeleteRelease(release *models.Release) (*models.Release, error)
}
