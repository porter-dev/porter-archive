package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// PreviewEnvironmentRepository represents the set of queries on the PreviewEnvironment model
type PreviewEnvironmentRepository interface {
	CreatePreviewEnvironment(a *models.PreviewEnvironment) (*models.PreviewEnvironment, error)
}
