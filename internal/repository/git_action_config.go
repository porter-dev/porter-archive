package repository

import "github.com/porter-dev/porter/internal/models"

// GitActionConfigRepository represents the set of queries on the
// GitActionConfig model
type GitActionConfigRepository interface {
	CreateGitActionConfig(gr *models.GitActionConfig) (*models.GitActionConfig, error)
	ReadGitActionConfig(id uint) (*models.GitActionConfig, error)
	UpdateGitActionConfig(gr *models.GitActionConfig) error
}
