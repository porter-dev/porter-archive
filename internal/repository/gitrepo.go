package repository

import "github.com/porter-dev/porter/internal/models"

// GitRepoRepository represents the set of queries on the
// GitRepo model
type GitRepoRepository interface {
	CreateGitRepo(gr *models.GitRepo) (*models.GitRepo, error)
	ReadGitRepo(id uint) (*models.GitRepo, error)
	ListGitReposByProjectID(projectID uint) ([]*models.GitRepo, error)
	UpdateGitRepo(gr *models.GitRepo) (*models.GitRepo, error)
	DeleteGitRepo(gr *models.GitRepo) error
}
