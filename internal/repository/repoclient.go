package repository

import "github.com/porter-dev/porter/internal/models"

// RepoClientRepository represents the set of queries on the
// RepoClient model
type RepoClientRepository interface {
	CreateRepoClient(rc *models.RepoClient) (*models.RepoClient, error)
	ReadRepoClient(id uint) (*models.RepoClient, error)
	ListRepoClientsByProjectID(projectID uint) ([]*models.RepoClient, error)
}
