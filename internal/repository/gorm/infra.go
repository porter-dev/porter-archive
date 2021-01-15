package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InfraRepository uses gorm.DB for querying the database
type InfraRepository struct {
	db *gorm.DB
}

// NewInfraRepository returns a InfraRepository which uses
// gorm.DB for querying the database
func NewInfraRepository(db *gorm.DB) repository.InfraRepository {
	return &InfraRepository{db}
}

// CreateInfra creates a new aws infra
func (repo *InfraRepository) CreateInfra(infra *models.Infra) (*models.Infra, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", infra.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Infras")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(infra); err != nil {
		return nil, err
	}

	return infra, nil
}

// ReadInfra gets a aws infra specified by a unique id
func (repo *InfraRepository) ReadInfra(id uint) (*models.Infra, error) {
	infra := &models.Infra{}

	if err := repo.db.Where("id = ?", id).First(&infra).Error; err != nil {
		return nil, err
	}

	return infra, nil
}

// ListInfrasByProjectID finds all aws infras
// for a given project id
func (repo *InfraRepository) ListInfrasByProjectID(
	projectID uint,
) ([]*models.Infra, error) {
	infras := []*models.Infra{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&infras).Error; err != nil {
		return nil, err
	}

	return infras, nil
}

// UpdateInfra modifies an existing Infra in the database
func (repo *InfraRepository) UpdateInfra(
	ai *models.Infra,
) (*models.Infra, error) {
	if err := repo.db.Save(ai).Error; err != nil {
		return nil, err
	}

	return ai, nil
}
