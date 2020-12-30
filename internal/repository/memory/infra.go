package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AWSInfraRepository implements repository.AWSInfraRepository
type AWSInfraRepository struct {
	canQuery  bool
	awsInfras []*models.AWSInfra
}

// NewAWSInfraRepository will return errors if canQuery is false
func NewAWSInfraRepository(canQuery bool) repository.AWSInfraRepository {
	return &AWSInfraRepository{
		canQuery,
		[]*models.AWSInfra{},
	}
}

// CreateAWSInfra creates a new aws infra
func (repo *AWSInfraRepository) CreateAWSInfra(
	infra *models.AWSInfra,
) (*models.AWSInfra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.awsInfras = append(repo.awsInfras, infra)
	infra.ID = uint(len(repo.awsInfras))

	return infra, nil
}

// ReadAWSInfra finds a aws infra by id
func (repo *AWSInfraRepository) ReadAWSInfra(
	id uint,
) (*models.AWSInfra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.awsInfras) || repo.awsInfras[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.awsInfras[index], nil
}

// ListAWSInfrasByProjectID finds all aws infras
// for a given project id
func (repo *AWSInfraRepository) ListAWSInfrasByProjectID(
	projectID uint,
) ([]*models.AWSInfra, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.AWSInfra, 0)

	for _, infra := range repo.awsInfras {
		if infra != nil && infra.ProjectID == projectID {
			res = append(res, infra)
		}
	}

	return res, nil
}
