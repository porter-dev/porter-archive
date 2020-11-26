package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// RegistryRepository uses gorm.DB for querying the database
type RegistryRepository struct {
	db *gorm.DB
}

// NewRegistryRepository returns a RegistryRepository which uses
// gorm.DB for querying the database
func NewRegistryRepository(db *gorm.DB) repository.RegistryRepository {
	return &RegistryRepository{db}
}

// CreateRegistry creates a new registry
func (repo *RegistryRepository) CreateRegistry(reg *models.Registry) (*models.Registry, error) {
	project := &models.Project{}

	if err := repo.db.Where("id = ?", reg.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Registries")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(reg); err != nil {
		return nil, err
	}

	return reg, nil
}

// ReadRegistry gets a registry specified by a unique id
func (repo *RegistryRepository) ReadRegistry(id uint) (*models.Registry, error) {
	reg := &models.Registry{}

	if err := repo.db.Where("id = ?", id).First(&reg).Error; err != nil {
		return nil, err
	}

	return reg, nil
}

// ListRegistriesByProjectID finds all registries
// for a given project id
func (repo *RegistryRepository) ListRegistriesByProjectID(
	projectID uint,
) ([]*models.Registry, error) {
	regs := []*models.Registry{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&regs).Error; err != nil {
		return nil, err
	}

	return regs, nil
}
