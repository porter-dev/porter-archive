package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// WriteProject is the function type for all Project write operations
type WriteProject func(project *models.Project) (*models.Project, error)

// ProjectRepository represents the set of queries on the Project model
type ProjectRepository interface {
	CreateProject(project *models.Project) (*models.Project, error)
	CreateProjectRole(project *models.Project, role *models.Role) (*models.Role, error)
	UpdateProject(project *models.Project) (*models.Project, error)
	UpdateProjectRole(projID uint, role *models.Role) (*models.Role, error)
	ReadProject(id uint) (*models.Project, error)
	ReadProjectRole(projID, userID uint) (*models.Role, error)
	ListProjectRoles(projID uint) ([]models.Role, error)
	ListProjectsByUserID(userID uint) ([]*models.Project, error)
	DeleteProject(project *models.Project) (*models.Project, error)
	DeleteProjectRole(projID, userID uint) (*models.Role, error)
}
