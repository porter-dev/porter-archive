package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AWSInfraRepository uses gorm.DB for querying the database
type AWSInfraRepository struct {
	db *gorm.DB
}

// NewAWSInfraRepository returns a AWSInfraRepository which uses
// gorm.DB for querying the database
func NewAWSInfraRepository(db *gorm.DB) repository.AWSInfraRepository {
	return &AWSInfraRepository{db}
}

// CreateAWSInfra creates a new aws infra
func (repo *AWSInfraRepository) CreateAWSInfra(infra *models.AWSInfra) (*models.AWSInfra, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", infra.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("AWSInfras")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(infra); err != nil {
		return nil, err
	}

	return infra, nil
}

// ReadAWSInfra gets a aws infra specified by a unique id
func (repo *AWSInfraRepository) ReadAWSInfra(id uint) (*models.AWSInfra, error) {
	infra := &models.AWSInfra{}

	if err := repo.db.Where("id = ?", id).First(&infra).Error; err != nil {
		return nil, err
	}

	return infra, nil
}

// ListAWSInfrasByProjectID finds all aws infras
// for a given project id
func (repo *AWSInfraRepository) ListAWSInfrasByProjectID(
	projectID uint,
) ([]*models.AWSInfra, error) {
	infras := []*models.AWSInfra{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&infras).Error; err != nil {
		return nil, err
	}

	return infras, nil
}

// UpdateAWSInfra modifies an existing AWSInfra in the database
func (repo *AWSInfraRepository) UpdateAWSInfra(
	ai *models.AWSInfra,
) (*models.AWSInfra, error) {
	if err := repo.db.Save(ai).Error; err != nil {
		return nil, err
	}

	return ai, nil
}
