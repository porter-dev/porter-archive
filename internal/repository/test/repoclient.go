package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// RepoClientRepository implements repository.RepoClientRepository
type RepoClientRepository struct {
	canQuery    bool
	repoClients []*models.RepoClient
}

// NewRepoClientRepository will return errors if canQuery is false
func NewRepoClientRepository(canQuery bool) repository.RepoClientRepository {
	return &RepoClientRepository{
		canQuery,
		[]*models.RepoClient{},
	}
}

// CreateRepoClient creates a new repo client and appends it to the in-memory list
func (repo *RepoClientRepository) CreateRepoClient(rc *models.RepoClient) (*models.RepoClient, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.repoClients = append(repo.repoClients, rc)
	rc.ID = uint(len(repo.repoClients))

	return rc, nil
}

// ReadRepoClient returns a repo client by id
func (repo *RepoClientRepository) ReadRepoClient(id uint) (*models.RepoClient, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.repoClients) || repo.repoClients[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.repoClients[index], nil
}

// ListRepoClientsByProjectID returns a list of repo clients that match a project id
func (repo *RepoClientRepository) ListRepoClientsByProjectID(projectID uint) ([]*models.RepoClient, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.RepoClient, 0)

	for _, rc := range repo.repoClients {
		if rc.ProjectID == projectID {
			res = append(res, rc)
		}
	}

	return res, nil
}
