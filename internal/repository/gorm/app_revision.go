package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AppRevisionRepository uses gorm.DB for querying the database
type AppRevisionRepository struct {
	db *gorm.DB
}

// NewAppRevisionRepository returns a AppRevisionRepository which uses
// gorm.DB for querying the database
func NewAppRevisionRepository(db *gorm.DB) repository.AppRevisionRepository {
	return &AppRevisionRepository{db}
}

// AppRevisionById finds an app revision by id
func (repo *AppRevisionRepository) AppRevisionById(projectID uint, id string) (*models.AppRevision, error) {
	AppRevision := &models.AppRevision{}

	if err := repo.db.Where("project_id = ? AND id = ?", projectID, id).Limit(1).Find(&AppRevision).Error; err != nil {
		return nil, err
	}

	return AppRevision, nil
}
