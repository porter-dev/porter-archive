package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ProjectRepository will return errors on queries if canQuery is false
// and only stores a small set of projects in-memory that are indexed by their
// array index + 1
type ProjectRepository struct {
	canQuery bool
	projects []*models.Project
}

// NewProjectRepository will return errors if canQuery is false
func NewProjectRepository(canQuery bool) repository.ProjectRepository {
	return &ProjectRepository{canQuery, []*models.Project{}}
}

// CreateProject appends a new project to the in-memory projects array
func (repo *ProjectRepository) CreateProject(project *models.Project) (*models.Project, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.projects = append(repo.projects, project)
	project.ID = uint(len(repo.projects))

	return project, nil
}

// CreateProjectRole appends a role to the existing array of roles
func (repo *ProjectRepository) CreateProjectRole(project *models.Project, role *models.Role) (*models.Role, error) {
	if !repo.canQuery {
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

// ReadProject gets a projects specified by a unique id
func (repo *ProjectRepository) ReadProject(id uint) (*models.Project, error) {
	if !repo.canQuery {
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
	if !repo.canQuery {
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
