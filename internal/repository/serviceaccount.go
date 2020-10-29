package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// ServiceAccountRepository represents the set of queries on the
// ServiceAccount model
type ServiceAccountRepository interface {
	CreateServiceAccountCandidate(saCandidate *models.ServiceAccountCandidate) (*models.ServiceAccountCandidate, error)
	ReadServiceAccountCandidate(id uint) (*models.ServiceAccountCandidate, error)
	DeleteServiceAccountCandidate(saCandidate *models.ServiceAccountCandidate) (*models.ServiceAccountCandidate, error)
	CreateServiceAccount(sa *models.ServiceAccount) (*models.ServiceAccount, error)
	ReadServiceAccount(id uint) (*models.ServiceAccount, error)
	DeleteServiceAccount(sa *models.ServiceAccount) (*models.ServiceAccount, error)
}
