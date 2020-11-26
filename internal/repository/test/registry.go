package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
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
	id uint,
) (*models.Registry, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.registries) || repo.registries[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
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
		if reg.ProjectID == projectID {
			res = append(res, reg)
		}
	}

	return res, nil
}
