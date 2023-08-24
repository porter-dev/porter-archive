package gorm

import (
	"github.com/google/uuid"
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

// AppRevisionsByAppAndDeploymentTarget finds all app revisions for a given app and deployment target
func (repo *AppRevisionRepository) AppRevisionsByAppAndDeploymentTarget(appID uint, deploymentTargetID uuid.UUID) ([]*models.AppRevision, error) {
	appRevisions := []*models.AppRevision{}

	if err := repo.db.Where("porter_app_id = ? AND deployment_target_id = ?", appID, deploymentTargetID).Find(&appRevisions).Error; err != nil {
		return nil, err
	}

	return appRevisions, nil
}
