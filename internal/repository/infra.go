package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// InfraRepository represents the set of queries on the Infra model
type InfraRepository interface {
	CreateInfra(repo *models.Infra) (*models.Infra, error)
	ReadInfra(projectID, infraID uint) (*models.Infra, error)
	ListInfrasByProjectID(projectID uint, apiVersion string) ([]*models.Infra, error)
	UpdateInfra(repo *models.Infra) (*models.Infra, error)

	// Operations
	AddOperation(infra *models.Infra, operation *models.Operation) (*models.Operation, error)
	ReadOperation(infraID uint, operationUID string) (*models.Operation, error)
	ListOperations(infraID uint) ([]*models.Operation, error)
	GetLatestOperation(infra *models.Infra) (*models.Operation, error)
	UpdateOperation(repo *models.Operation) (*models.Operation, error)
}
