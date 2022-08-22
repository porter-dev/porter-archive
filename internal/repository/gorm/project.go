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

// CreateLegacyProjectRole appends a role to the existing array of roles
func (repo *ProjectRepository) CreateLegacyProjectRole(project *models.Project, role *models.Role) (*models.Role, error) {
	assoc := repo.db.Model(&project).Association("Roles")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(role); err != nil {
		return nil, err
	}

	return role, nil
}

// UpdateProject updates an existing project
func (repo *ProjectRepository) UpdateProject(project *models.Project) (*models.Project, error) {
	if err := repo.db.Save(project).Error; err != nil {
		return nil, err
	}

	return project, nil
}

func (repo *ProjectRepository) UpdateLegacyProjectRole(projID uint, role *models.Role) (*models.Role, error) {
	foundRole := &models.Role{}

	if err := repo.db.Where("project_id = ? AND user_id = ?", projID, role.UserID).First(&foundRole).Error; err != nil {
		return nil, err
	}

	role.ID = foundRole.ID

	if err := repo.db.Save(&role).Error; err != nil {
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

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ReadLegacyProjectRole(projID, userID uint) (*models.Role, error) {
	// find the role
	role := &models.Role{}

	if err := repo.db.Where("project_id = ? AND user_id = ?", projID, userID).First(&role).Error; err != nil {
		return nil, err
	}

	return role, nil
}

// ListProjectsByUserID lists projects where a user has an associated role
func (repo *ProjectRepository) ListProjectsByUserID(userID uint) ([]*models.Project, error) {
	projects := make([]*models.Project, 0)

	subQuery := repo.db.Model(&models.ProjectRole{}).Joins("JOIN user_roles ON user_roles.project_role_id = project_roles.id").Where("user_id = ?", userID).Select("project_id")

	if err := repo.db.Preload("Roles").Model(&models.Project{}).Where("id IN (?)", subQuery).Find(&projects).Error; err != nil {
		return nil, err
	}

	return projects, nil
}

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ListLegacyProjectRoles(projID uint) ([]models.Role, error) {
	project := &models.Project{}

	if err := repo.db.Preload("Roles").Where("id = ?", projID).First(&project).Error; err != nil {
		return nil, err
	}

	return project.Roles, nil
}

// DeleteProject deletes a project (marking deleted in the db)
func (repo *ProjectRepository) DeleteProject(project *models.Project) (*models.Project, error) {
	if err := repo.db.Delete(&project).Error; err != nil {
		return nil, err
	}
	return project, nil
}

func (repo *ProjectRepository) DeleteLegacyProjectRole(projID, userID uint) (*models.Role, error) {
	// find the role
	role := &models.Role{}

	if err := repo.db.Where("project_id = ? AND user_id = ?", projID, userID).First(&role).Error; err != nil {
		return nil, err
	}

	if err := repo.db.Delete(&role).Error; err != nil {
		return nil, err
	}

	return role, nil
}
