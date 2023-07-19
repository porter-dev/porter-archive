package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// EnvironmentConfigRepository represents the set of queries on the EnvironmentConfig model
type EnvironmentConfigRepository interface {
	ReadEnvironmentConfig(projectID, clusterID, id uint) (*models.EnvironmentConfig, error)
	ReadDefaultEnvironmentConfig(projectID, clusterID uint) (*models.EnvironmentConfig, error)
}
