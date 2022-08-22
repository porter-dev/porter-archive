package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type ProjectRoleRepository struct {
}

func NewProjectRoleRepository() repository.ProjectRoleRepository {
	return &ProjectRoleRepository{}
}

func (repo *ProjectRoleRepository) CreateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) ReadProjectRole(projectID uint, roleUID string) (*models.ProjectRole, error) {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) ListProjectRoles(projectID uint) ([]*models.ProjectRole, error) {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) ListAllRolesForUser(projectID, userID uint) ([]*models.ProjectRole, error) {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) UpdateUsersInProjectRole(projectID uint, roleUID string, userIDs []uint) error {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) ClearUsersInProjectRole(projectID uint, roleUID string) error {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) UpdateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	panic("not implemented")
}

func (repo *ProjectRoleRepository) DeleteProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	panic("not implemented")
}
