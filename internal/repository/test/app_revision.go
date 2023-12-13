package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AppRevisionRepository is a test repository that implements repository.AppRevisionRepository
type AppRevisionRepository struct {
	canQuery bool
}

// NewAppRevisionRepository returns the test AppRevisionRepository
func NewAppRevisionRepository() repository.AppRevisionRepository {
	return &AppRevisionRepository{canQuery: false}
}

// AppRevisionByInstanceIDAndRevisionNumber finds an app revision by revision number
func (repo *AppRevisionRepository) AppRevisionByInstanceIDAndRevisionNumber(projectID uint, appInstanceId string, revisionNumber uint) (*models.AppRevision, error) {
	return nil, errors.New("cannot read database")
}
