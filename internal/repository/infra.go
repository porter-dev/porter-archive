package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// AWSInfraRepository represents the set of queries on the AWSInfra model
type AWSInfraRepository interface {
	CreateAWSInfra(repo *models.AWSInfra) (*models.AWSInfra, error)
	ReadAWSInfra(id uint) (*models.AWSInfra, error)
	ListAWSInfrasByProjectID(projectID uint) ([]*models.AWSInfra, error)
}
