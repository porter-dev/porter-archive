package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectRepository uses gorm.DB for querying the database
type ProjectRepository struct {
	db *gorm.DB
}

// NewProjectRepository returns a ProjectRepository which uses
// gorm.DB for querying the database
func NewProjectRepository(db *gorm.DB) repository.ProjectRepository {
	return &ProjectRepository{db}
}

// CreateProject creates a new project
func (repo *ProjectRepository) CreateProject(project *models.Project) (*models.Project, error) {
	if err := repo.db.Create(project).Error; err != nil {
		return nil, err
	}

	return project, nil
}

// CreateProjectRole appends a role to the existing array of roles
func (repo *ProjectRepository) CreateProjectRole(project *models.Project, role *models.Role) (*models.Role, error) {
	assoc := repo.db.Model(&project).Association("Roles")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(role); err != nil {
		return nil, err
	}

	return role, nil
}

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ReadProject(id uint) (*models.Project, error) {
	project := &models.Project{}

	if err := repo.db.Preload("Roles").Where("id = ?", id).First(&project).Error; err != nil {
		return nil, err
	}

	return project, nil
}
