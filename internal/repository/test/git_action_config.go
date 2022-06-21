package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// GitActionConfigRepository uses gorm.DB for querying the database
type GitActionConfigRepository struct {
	canQuery         bool
	gitActionConfigs []*models.GitActionConfig
}

func NewGitActionConfigRepository(canQuery bool) repository.GitActionConfigRepository {
	return &GitActionConfigRepository{
		canQuery,
		[]*models.GitActionConfig{},
	}
}

// CreateGitActionConfig creates a new git repo
func (repo *GitActionConfigRepository) CreateGitActionConfig(gac *models.GitActionConfig) (*models.GitActionConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.gitActionConfigs = append(repo.gitActionConfigs, gac)
	gac.ID = uint(len(repo.gitActionConfigs))

	return gac, nil
}

// ReadGitActionConfig gets a git repo specified by a unique id
func (repo *GitActionConfigRepository) ReadGitActionConfig(id uint) (*models.GitActionConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.gitActionConfigs) || repo.gitActionConfigs[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.gitActionConfigs[index], nil
}

func (repo *GitActionConfigRepository) UpdateGitActionConfig(gac *models.GitActionConfig) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(gac.ID-1) >= len(repo.gitActionConfigs) || repo.gitActionConfigs[gac.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(gac.ID - 1)
	repo.gitActionConfigs[index] = gac
	return nil
}
