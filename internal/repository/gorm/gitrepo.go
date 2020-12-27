package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// GitRepoRepository uses gorm.DB for querying the database
type GitRepoRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewGitRepoRepository returns a GitRepoRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewGitRepoRepository(db *gorm.DB, key *[32]byte) repository.GitRepoRepository {
	return &GitRepoRepository{db, key}
}

// CreateGitRepo creates a new git repo
func (repo *GitRepoRepository) CreateGitRepo(gr *models.GitRepo) (*models.GitRepo, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", gr.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("GitRepos")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(gr); err != nil {
		return nil, err
	}

	return gr, nil
}

// ReadGitRepo gets a git repo specified by a unique id
func (repo *GitRepoRepository) ReadGitRepo(id uint) (*models.GitRepo, error) {
	gr := &models.GitRepo{}

	if err := repo.db.Where("id = ?", id).First(&gr).Error; err != nil {
		return nil, err
	}

	return gr, nil
}

// ListGitReposByProjectID finds all git repos
// for a given project id
func (repo *GitRepoRepository) ListGitReposByProjectID(
	projectID uint,
) ([]*models.GitRepo, error) {
	grs := []*models.GitRepo{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&grs).Error; err != nil {
		return nil, err
	}

	return grs, nil
}

// UpdateGitRepo modifies an existing GitRepo in the database
func (repo *GitRepoRepository) UpdateGitRepo(
	gr *models.GitRepo,
) (*models.GitRepo, error) {
	if err := repo.db.Save(gr).Error; err != nil {
		return nil, err
	}

	return gr, nil
}

// DeleteGitRepo removes a git repo from the db
func (repo *GitRepoRepository) DeleteGitRepo(
	gr *models.GitRepo,
) error {
	if err := repo.db.Where("id = ?", gr.ID).Delete(&models.GitRepo{}).Error; err != nil {
		return err
	}

	return nil
}
