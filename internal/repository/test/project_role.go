package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type ProjectRoleRepository struct {
	canQuery bool
	roles    []*models.ProjectRole
}

func NewProjectRoleRepository(canQuery bool) repository.ProjectRoleRepository {
	return &ProjectRoleRepository{
		canQuery: canQuery,
	}
}

func (repo *ProjectRoleRepository) CreateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.roles = append(repo.roles, role)
	role.ID = uint(len(repo.roles))

	return role, nil
}

func (repo *ProjectRoleRepository) ReadProjectRole(projectID uint, roleUID string) (*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	for _, role := range repo.roles {
		if role.UniqueID == roleUID && role.ProjectID == projectID {
			return role, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (repo *ProjectRoleRepository) ListProjectRoles(projectID uint) ([]*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	return repo.roles, nil
}

func (repo *ProjectRoleRepository) ListAllRolesForUser(projectID, userID uint) ([]*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	var res []*models.ProjectRole

	for _, role := range repo.roles {
		if role.ProjectID != projectID {
			continue
		}

		for _, u := range role.Users {
			if u.ID == userID {
				res = append(res, role)
			}
		}
	}

	return res, nil
}

func (repo *ProjectRoleRepository) UpdateUsersInProjectRole(projectID uint, roleUID string, userIDs []uint) error {
	if !repo.canQuery {
		return errors.New("cannot write database")
	}

	var role *models.ProjectRole

	for _, r := range repo.roles {
		if r.UniqueID == roleUID && r.ProjectID == projectID {
			role = r
			break
		}
	}

	if role == nil {
		return gorm.ErrRecordNotFound
	}

	role.Users = []models.User{}

	for _, userID := range userIDs {
		role.Users = append(role.Users, models.User{
			Model: gorm.Model{
				ID: userID,
			},
		})
	}

	return nil
}

func (repo *ProjectRoleRepository) ClearUsersInProjectRole(projectID uint, roleUID string) error {
	if !repo.canQuery {
		return errors.New("cannot write database")
	}

	var role *models.ProjectRole

	for _, r := range repo.roles {
		if r.UniqueID == roleUID && r.ProjectID == projectID {
			role = r
			break
		}
	}

	if role == nil {
		return gorm.ErrRecordNotFound
	}

	role.Users = []models.User{}

	return nil
}

func (repo *ProjectRoleRepository) UpdateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	if role == nil || int(role.ID-1) >= len(repo.roles) || repo.roles[role.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	repo.roles[role.ID-1] = role

	return role, nil
}

func (repo *ProjectRoleRepository) DeleteProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	if role == nil || int(role.ID-1) >= len(repo.roles) || repo.roles[role.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	var newRoles []*models.ProjectRole

	for _, r := range repo.roles {
		if r.UniqueID != role.UniqueID {
			newRoles = append(newRoles, r)
		}
	}

	repo.roles = newRoles

	return role, nil
}
