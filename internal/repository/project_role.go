package repository

import "github.com/porter-dev/porter/internal/models"

// ProjectRoleRepository represents the set of queries on the ProjectRole model
type ProjectRoleRepository interface {
	CreateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error)
	ReadProjectRole(projectID uint, roleUID string) (*models.ProjectRole, error)
	ListProjectRoles(projectID uint) ([]*models.ProjectRole, error)
	ListAllRolesForUser(projectID, userID uint) ([]*models.ProjectRole, error)
	UpdateUsersInProjectRole(projectID uint, roleUID string, userIDs []uint) error
	ClearUsersInProjectRole(projectID uint, roleUID string) error
	UpdateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error)
	DeleteProjectRole(role *models.ProjectRole) (*models.ProjectRole, error)
}
