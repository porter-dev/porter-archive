package repository

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
)

// AppRevisionRepository represents the set of queries on the AppRevision model
type AppRevisionRepository interface {
	// AppRevisionByInstanceIDAndRevisionNumber finds an app revision by revision number
	AppRevisionByInstanceIDAndRevisionNumber(projectID uint, appInstanceId string, revisionNumber uint) (*models.AppRevision, error)
	// LatestNumberedAppRevision finds the latest numbered app revision
	LatestNumberedAppRevision(projectID uint, appInstanceId string) (*models.AppRevision, error)
	// ListNumberedRevisions lists all numbered revisions for an app instance
	Revisions(projectID uint, appInstanceId string, opts ...helpers.QueryOption) ([]*models.AppRevision, helpers.PaginatedResult, error)
}
