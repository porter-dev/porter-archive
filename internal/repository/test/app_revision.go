package test

import (
	"errors"

	"github.com/google/uuid"
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

// AppRevisionsByAppAndDeploymentTarget finds all app revisions for a given app and deployment target
func (repo *AppRevisionRepository) AppRevisionsByAppAndDeploymentTarget(appID uint, deploymentTargetID uuid.UUID) ([]*models.AppRevision, error) {
	return nil, errors.New("cannot read database")
}
