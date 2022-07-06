package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

const (
	CreateProjectMethod        string = "create_project_0"
	CreateProjectRoleMethod    string = "create_project_role_0"
	ReadProjectMethod          string = "read_project_0"
	ListProjectsByUserIDMethod string = "list_projects_by_user_id_0"
)

// ProjectRepository will return errors on queries if canQuery is false
// and only stores a small set of projects in-memory that are indexed by their
// array index + 1
type ProjectRepository struct {
	canQuery       bool
	failingMethods string
	projects       []*models.Project
}

// NewProjectRepository will return errors if canQuery is false
func NewProjectRepository(canQuery bool, failingMethods ...string) repository.ProjectRepository {
	return &ProjectRepository{canQuery, strings.Join(failingMethods, ","), []*models.Project{}}
}

// CreateProject appends a new project to the in-memory projects array
func (repo *ProjectRepository) CreateProject(project *models.Project) (*models.Project, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, CreateProjectMethod) {
		return nil, errors.New("Cannot write database")
	}

	repo.projects = append(repo.projects, project)
	project.ID = uint(len(repo.projects))

	return project, nil
}

// CreateProjectRole appends a role to the existing array of roles
func (repo *ProjectRepository) CreateProjectRole(project *models.Project, role *models.Role) (*models.Role, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, CreateProjectRoleMethod) {
		return nil, errors.New("Cannot write database")
	}

	if int(project.ID-1) >= len(repo.projects) || repo.projects[project.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(project.ID - 1)
	oldProject := *repo.projects[index]
	repo.projects[index] = project
	project.Roles = append(oldProject.Roles, *role)

	return role, nil
}

func (repo *ProjectRepository) UpdateProject(project *models.Project) (*models.Project, error) {
	panic("unimplemented")
}

// CreateProjectRole appends a role to the existing array of roles
func (repo *ProjectRepository) UpdateProjectRole(projID uint, role *models.Role) (*models.Role, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	var foundProject *models.Project

	// find all roles matching
	for _, project := range repo.projects {
		if project.ID == projID {
			foundProject = project
		}
	}

	if foundProject == nil {
		return nil, gorm.ErrRecordNotFound
	}

	var index int

	for i, _role := range foundProject.Roles {
		if _role.UserID == role.UserID {
			index = i
		}
	}

	if index == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	foundProject.Roles[index] = *role
	return role, nil
}

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ReadProjectRole(userID, projID uint) (*models.Role, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(projID-1) >= len(repo.projects) || repo.projects[projID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	// find role in project roles
	index := int(projID - 1)

	for _, role := range repo.projects[index].Roles {
		if role.UserID == userID {
			return &role, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ReadProject(id uint) (*models.Project, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, ReadProjectMethod) {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.projects) || repo.projects[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.projects[index], nil
}

// ListProjectsByUserID lists projects where a user has an associated role
func (repo *ProjectRepository) ListProjectsByUserID(userID uint) ([]*models.Project, error) {
	if !repo.canQuery || strings.Contains(repo.failingMethods, ListProjectsByUserIDMethod) {
		return nil, errors.New("Cannot read from database")
	}

	resp := make([]*models.Project, 0)

	// find all roles matching
	for _, project := range repo.projects {
		for _, role := range project.Roles {
			if role.UserID == userID {
				resp = append(resp, project)
			}
		}
	}

	return resp, nil
}

// ListProjectRoles returns a list of roles for the project
func (repo *ProjectRepository) ListProjectRoles(projID uint) ([]models.Role, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(projID-1) >= len(repo.projects) || repo.projects[projID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(projID - 1)
	repo.projects[index] = nil

	return repo.projects[index].Roles, nil
}

// DeleteProject removes a project
func (repo *ProjectRepository) DeleteProject(project *models.Project) (*models.Project, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(project.ID-1) >= len(repo.projects) || repo.projects[project.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(project.ID - 1)
	repo.projects[index] = nil

	return project, nil
}

func (repo *ProjectRepository) DeleteProjectRole(projID, userID uint) (*models.Role, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	var foundProject *models.Project

	// find all roles matching
	for _, project := range repo.projects {
		if project.ID == projID {
			foundProject = project
		}
	}

	if foundProject == nil {
		return nil, gorm.ErrRecordNotFound
	}

	var index int

	for i, _role := range foundProject.Roles {
		if _role.UserID == userID {
			index = i
		}
	}

	if index == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	res := foundProject.Roles[index]

	foundProject.Roles = append(foundProject.Roles[:index], foundProject.Roles[index+1:]...)

	return &res, nil
}
