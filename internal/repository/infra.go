package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// InfraRepository represents the set of queries on the Infra model
type InfraRepository interface {
	CreateInfra(repo *models.Infra) (*models.Infra, error)
	ReadInfra(projectID, infraID uint) (*models.Infra, error)
	ListInfrasByProjectID(projectID uint) ([]*models.Infra, error)
	UpdateInfra(repo *models.Infra) (*models.Infra, error)
}
