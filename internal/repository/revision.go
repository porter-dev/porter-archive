package repository

import "github.com/porter-dev/porter/internal/models"

type RevisionRepository interface {
	CreateRevision(revision *models.Revision) (*models.Revision, error)
	GetLatestRevision(appName string) (*models.Revision, error)
}