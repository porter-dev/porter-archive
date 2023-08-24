package repository

import (
	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
)

// AppRevisionRepository represents the set of queries on the AppRevision model
type AppRevisionRepository interface {
	// AppRevisionsByAppAndDeploymentTarget finds all app revisions for a given app and deployment target
	AppRevisionsByAppAndDeploymentTarget(appID uint, deploymentTargetID uuid.UUID) ([]*models.AppRevision, error)
}
