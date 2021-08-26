package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InfraRepository implements repository.InfraRepository
type InfraRepository struct {
	canQuery bool
	infras   []*models.Infra
}

// NewInfraRepository will return errors if canQuery is false
func NewInfraRepository(canQuery bool) repository.InfraRepository {
	return &InfraRepository{
		canQuery,
		[]*models.Infra{},
	}
}

// CreateInfra creates a new aws infra
func (repo *InfraRepository) CreateInfra(
	infra *models.Infra,
) (*models.Infra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.infras = append(repo.infras, infra)
	infra.ID = uint(len(repo.infras))

	return infra, nil
}

// ReadInfra finds a aws infra by id
func (repo *InfraRepository) ReadInfra(
	projectID,
	id uint,
) (*models.Infra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.infras) || repo.infras[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.infras[index], nil
}

// ListInfrasByProjectID finds all aws infras
// for a given project id
func (repo *InfraRepository) ListInfrasByProjectID(
	projectID uint,
) ([]*models.Infra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.Infra, 0)

	for _, infra := range repo.infras {
		if infra != nil && infra.ProjectID == projectID {
			res = append(res, infra)
		}
	}

	return res, nil
}

// UpdateInfra modifies an existing Infra in the database
func (repo *InfraRepository) UpdateInfra(
	ai *models.Infra,
) (*models.Infra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(ai.ID-1) >= len(repo.infras) || repo.infras[ai.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(ai.ID - 1)
	repo.infras[index] = ai

	return ai, nil
}
