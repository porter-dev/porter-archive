package repository

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// HelmRepoRepository represents the set of queries on the HelmRepo model
type HelmRepoRepository interface {
	CreateHelmRepo(repo *models.HelmRepo) (*models.HelmRepo, error)
	ReadHelmRepo(projectID, hrID uint) (*models.HelmRepo, error)
	ListHelmReposByProjectID(projectID uint) ([]*models.HelmRepo, error)
	UpdateHelmRepo(repo *models.HelmRepo) (*models.HelmRepo, error)
	UpdateHelmRepoTokenCache(tokenCache *ints.HelmRepoTokenCache) (*models.HelmRepo, error)
	DeleteHelmRepo(repo *models.HelmRepo) error
}
