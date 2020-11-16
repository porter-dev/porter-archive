package forms

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// WriteProjectForm is a generic form for write operations to the Project model
type WriteProjectForm interface {
	ToProject(repo repository.ProjectRepository) (*models.Project, error)
}

// CreateProjectForm represents the accepted values for creating a project
type CreateProjectForm struct {
	WriteProjectForm
	Name string `json:"name" form:"required"`
}

// ToProject converts the project to a gorm project model
func (cpf *CreateProjectForm) ToProject(_ repository.ProjectRepository) (*models.Project, error) {
	return &models.Project{
		Name: cpf.Name,
	}, nil
}

// CreateProjectRoleForm represents the accepted values for creating a project
// role
type CreateProjectRoleForm struct {
	WriteProjectForm
	ID    uint          `json:"project_id" form:"required"`
	Roles []models.Role `json:"roles"`
}

// ToProject converts the form to a gorm project model
func (cprf *CreateProjectRoleForm) ToProject(_ repository.ProjectRepository) (*models.Project, error) {
	return &models.Project{
		Model: gorm.Model{
			ID: cprf.ID,
		},
		Roles: cprf.Roles,
	}, nil
}
