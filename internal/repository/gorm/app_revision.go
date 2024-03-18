package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
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

// AppRevisionByInstanceIDAndRevisionNumber finds an app revision by revision number
func (repo *AppRevisionRepository) AppRevisionByInstanceIDAndRevisionNumber(projectID uint, instanceId string, revisionNumber uint) (*models.AppRevision, error) {
	AppRevision := &models.AppRevision{}

	if err := repo.db.Where("project_id = ? AND app_instance_id = ? AND revision_number = ?", projectID, instanceId, revisionNumber).Limit(1).Find(&AppRevision).Error; err != nil {
		return nil, err
	}

	return AppRevision, nil
}

// LatestNumberedAppRevision finds the latest numbered app revision
func (repo *AppRevisionRepository) LatestNumberedAppRevision(projectID uint, appInstanceId string) (*models.AppRevision, error) {
	AppRevision := &models.AppRevision{}

	if err := repo.db.Where("project_id = ? AND app_instance_id = ?", projectID, appInstanceId).Order("revision_number DESC").Limit(1).Find(&AppRevision).Error; err != nil {
		return nil, err
	}

	return AppRevision, nil
}

// Revisions lists all revisions for a projectID and appInstanceId
func (repo *AppRevisionRepository) Revisions(projectID uint, appInstanceId string, opts ...helpers.QueryOption) ([]*models.AppRevision, helpers.PaginatedResult, error) {
	var appRevisions []*models.AppRevision

	resultDB := repo.db.Where("project_id = ? AND app_instance_id = ?", projectID, appInstanceId)

	var paginatedResult helpers.PaginatedResult
	resultDB = resultDB.Scopes(helpers.Paginate(repo.db, &paginatedResult, opts...))

	if err := resultDB.Find(&appRevisions).Error; err != nil {
		return nil, paginatedResult, err
	}

	return appRevisions, paginatedResult, nil
}
