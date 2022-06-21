package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// GitActionConfigRepository uses gorm.DB for querying the database
type GitActionConfigRepository struct {
	db *gorm.DB
}

// NewGitActionConfigRepository returns a GitActionConfigRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewGitActionConfigRepository(db *gorm.DB) repository.GitActionConfigRepository {
	return &GitActionConfigRepository{db}
}

// CreateGitActionConfig creates a new git repo
func (repo *GitActionConfigRepository) CreateGitActionConfig(ga *models.GitActionConfig) (*models.GitActionConfig, error) {
	release := &models.Release{}

	if err := repo.db.Where("id = ?", ga.ReleaseID).First(&release).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&release).Association("GitActionConfig")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(ga); err != nil {
		return nil, err
	}

	return ga, nil
}

// ReadGitActionConfig gets a git repo specified by a unique id
func (repo *GitActionConfigRepository) ReadGitActionConfig(id uint) (*models.GitActionConfig, error) {
	ga := &models.GitActionConfig{}

	if err := repo.db.Where("id = ?", id).First(&ga).Error; err != nil {
		return nil, err
	}

	return ga, nil
}

func (repo *GitActionConfigRepository) UpdateGitActionConfig(ga *models.GitActionConfig) error {
	return repo.db.Save(ga).Error
}
