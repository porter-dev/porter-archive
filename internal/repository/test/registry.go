package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// RegistryRepository implements repository.RegistryRepository
type RegistryRepository struct {
	canQuery   bool
	registries []*models.Registry
}

// NewRegistryRepository will return errors if canQuery is false
func NewRegistryRepository(canQuery bool) repository.RegistryRepository {
	return &RegistryRepository{
		canQuery,
		[]*models.Registry{},
	}
}

// CreateRegistry creates a new registry
func (repo *RegistryRepository) CreateRegistry(
	reg *models.Registry,
) (*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.registries = append(repo.registries, reg)
	reg.ID = uint(len(repo.registries))

	return reg, nil
}

// ReadRegistry finds a registry by id
func (repo *RegistryRepository) ReadRegistry(
	projectID, regID uint,
) (*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(regID-1) >= len(repo.registries) || repo.registries[regID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(regID - 1)
	return repo.registries[index], nil
}

// ListRegistriesByProjectID finds all registries
// for a given project id
func (repo *RegistryRepository) ListRegistriesByProjectID(
	projectID uint,
) ([]*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.Registry, 0)

	for _, reg := range repo.registries {
		if reg != nil && reg.ProjectID == projectID {
			res = append(res, reg)
		}
	}

	return res, nil
}

// UpdateRegistry modifies an existing Registry in the database
func (repo *RegistryRepository) UpdateRegistry(
	reg *models.Registry,
) (*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(reg.ID-1) >= len(repo.registries) || repo.registries[reg.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(reg.ID - 1)
	repo.registries[index] = reg

	return reg, nil
}

// UpdateRegistryTokenCache updates the token cache for a registry
func (repo *RegistryRepository) UpdateRegistryTokenCache(
	tokenCache *ints.RegTokenCache,
) (*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	index := int(tokenCache.RegistryID - 1)
	repo.registries[index].TokenCache.Token = tokenCache.Token
	repo.registries[index].TokenCache.Expiry = tokenCache.Expiry

	return repo.registries[index], nil
}

// DeleteRegistry removes a registry from the array by setting it to nil
func (repo *RegistryRepository) DeleteRegistry(
	reg *models.Registry,
) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(reg.ID-1) >= len(repo.registries) || repo.registries[reg.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(reg.ID - 1)
	repo.registries[index] = nil

	return nil
}
