package repository

import (
	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// RegistryRepository represents the set of queries on the Registry model
type RegistryRepository interface {
	CreateRegistry(reg *models.Registry) (*models.Registry, error)
	ReadRegistry(id uint) (*models.Registry, error)
	ListRegistriesByProjectID(projectID uint) ([]*models.Registry, error)
	UpdateRegistryIntTokenCache(tokenCache *ints.TokenCache) (*models.Registry, error)
	UpdateRegistryDockerTokenCache(tokenCache *ints.RegTokenCache) (*models.Registry, error)
}
