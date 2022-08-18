package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectRoleRepository uses gorm.DB for querying the database
type ProjectRoleRepository struct {
	db *gorm.DB
}

// NewProjectRoleRepository returns a ProjectRoleRepository which uses
// gorm.DB for querying the database
func NewProjectRoleRepository(db *gorm.DB) repository.ProjectRoleRepository {
	return &ProjectRoleRepository{db}
}

func (repo *ProjectRoleRepository) CreateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if err := repo.db.Create(role).Error; err != nil {
		return nil, err
	}

	return role, nil
}

func (repo *ProjectRoleRepository) ReadProjectRole(projectID uint, roleUID string) (*models.ProjectRole, error) {
	role := &models.ProjectRole{}

	if err := repo.db.Where("project_id = ? AND unique_id = ?", projectID, roleUID).First(role).Error; err != nil {
		return nil, err
	}

	return role, nil
}

func (repo *ProjectRoleRepository) ListProjectRoles(projectID uint) ([]*models.ProjectRole, error) {
	roles := []*models.ProjectRole{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&roles).Error; err != nil {
		return nil, err
	}

	return roles, nil
}

func (repo *ProjectRoleRepository) UpdateUsersInProjectRole(projectID uint, roleUID string, userIDs []uint) error {
	users := []*models.User{}

	if err := repo.db.Find(&users, userIDs).Error; err != nil {
		return err
	}

	role := &models.ProjectRole{}

	if err := repo.db.Where("project_id = ? AND unique_id = ?", projectID, roleUID).First(role).Error; err != nil {
		return err
	}

	assoc := repo.db.Model(&role).Association("Users")

	if assoc.Error != nil {
		return assoc.Error
	}

	if err := assoc.Replace(users); err != nil {
		return err
	}

	return nil
}

func (repo *ProjectRoleRepository) UpdateProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if err := repo.db.Save(role).Error; err != nil {
		return nil, err
	}

	return role, nil
}

func (repo *ProjectRoleRepository) DeleteProjectRole(role *models.ProjectRole) (*models.ProjectRole, error) {
	if err := repo.db.Delete(role).Error; err != nil {
		return nil, err
	}

	return role, nil
}
