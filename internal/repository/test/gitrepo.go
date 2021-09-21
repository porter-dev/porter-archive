package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"

	"gorm.io/gorm"
)

// GitRepoRepository implements repository.GitRepoRepository
type GitRepoRepository struct {
	canQuery bool
	gitRepos []*models.GitRepo
}

// NewGitRepoRepository will return errors if canQuery is false
func NewGitRepoRepository(canQuery bool) repository.GitRepoRepository {
	return &GitRepoRepository{
		canQuery,
		[]*models.GitRepo{},
	}
}

// CreateGitRepo creates a new repo client and appends it to the in-memory list
func (repo *GitRepoRepository) CreateGitRepo(gr *models.GitRepo) (*models.GitRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.gitRepos = append(repo.gitRepos, gr)
	gr.ID = uint(len(repo.gitRepos))

	return gr, nil
}

// ReadGitRepo returns a repo client by id
func (repo *GitRepoRepository) ReadGitRepo(id uint) (*models.GitRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.gitRepos) || repo.gitRepos[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.gitRepos[index], nil
}

// ListGitReposByProjectID returns a list of repo clients that match a project id
func (repo *GitRepoRepository) ListGitReposByProjectID(projectID uint) ([]*models.GitRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.GitRepo, 0)

	for _, gr := range repo.gitRepos {
		if gr != nil && gr.ProjectID == projectID {
			res = append(res, gr)
		}
	}

	return res, nil
}

// UpdateGitRepo modifies an existing GitRepo in the database
func (repo *GitRepoRepository) UpdateGitRepo(
	gr *models.GitRepo,
) (*models.GitRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(gr.ID-1) >= len(repo.gitRepos) || repo.gitRepos[gr.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(gr.ID - 1)
	repo.gitRepos[index] = gr

	return gr, nil
}

// DeleteGitRepo removes a repoistry from the array by setting it to nil
func (repo *GitRepoRepository) DeleteGitRepo(
	gr *models.GitRepo,
) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(gr.ID-1) >= len(repo.gitRepos) || repo.gitRepos[gr.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(gr.ID - 1)
	repo.gitRepos[index] = nil

	return nil
}
