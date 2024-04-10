package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// AppRevisionRepository represents the set of queries on the AppRevision model
type AppRevisionRepository interface {
	// AppRevisionById finds an app revision by id
	AppRevisionById(projectID uint, appRevisionId string) (*models.AppRevision, error)
}
