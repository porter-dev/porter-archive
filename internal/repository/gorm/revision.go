package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type RevisionRepository struct {
	db *gorm.DB
}

func NewRevisionRepository(db *gorm.DB) repository.RevisionRepository {
	return &RevisionRepository{db}
}

func (repo *RevisionRepository) CreateRevision(revision *models.Revision) (*models.Revision, error) {
	if err := repo.db.Create(revision).Error; err != nil {
		return nil, err
	}
	return revision, nil
}

func (repo *RevisionRepository) GetLatestRevision(appName string) (*models.Revision, error) {
	revision := &models.Revision{}

	// get latest revision joined with a porter_app of this name
	if err := repo.db.
		Joins("JOIN porter_apps ON porter_apps.id = revisions.porter_app_id").
		Where("porter_apps.name = ?", appName).
		Order("revisions.version DESC").First(&revision).Error; err != nil {
		return nil, err
	}

	return revision, nil
}
