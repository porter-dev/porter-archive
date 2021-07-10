package forms

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
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

// UpdateProjectRoleForm represents the accepted values for updating a project
// role
type UpdateProjectRoleForm struct {
	Kind string `json:"kind"`
}
