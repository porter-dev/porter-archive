package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// HelmRepoRepository implements repository.HelmRepoRepository
type HelmRepoRepository struct {
	canQuery  bool
	helmRepos []*models.HelmRepo
}

// NewHelmRepoRepository will return errors if canQuery is false
func NewHelmRepoRepository(canQuery bool) repository.HelmRepoRepository {
	return &HelmRepoRepository{
		canQuery,
		[]*models.HelmRepo{},
	}
}

// CreateHelmRepo creates a new repoistry
func (repo *HelmRepoRepository) CreateHelmRepo(
	hr *models.HelmRepo,
) (*models.HelmRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.helmRepos = append(repo.helmRepos, hr)
	hr.ID = uint(len(repo.helmRepos))

	return hr, nil
}

// ReadHelmRepo finds a repoistry by id
func (repo *HelmRepoRepository) ReadHelmRepo(
	projectID uint,
	id uint,
) (*models.HelmRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.helmRepos) || repo.helmRepos[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.helmRepos[index], nil
}

// ListHelmReposByProjectID finds all repoistries
// for a given project id
func (repo *HelmRepoRepository) ListHelmReposByProjectID(
	projectID uint,
) ([]*models.HelmRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.HelmRepo, 0)

	for _, hr := range repo.helmRepos {
		if hr != nil && hr.ProjectID == projectID {
			res = append(res, hr)
		}
	}

	return res, nil
}

// UpdateHelmRepo modifies an existing HelmRepo in the database
func (repo *HelmRepoRepository) UpdateHelmRepo(
	hr *models.HelmRepo,
) (*models.HelmRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(hr.ID-1) >= len(repo.helmRepos) || repo.helmRepos[hr.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(hr.ID - 1)
	repo.helmRepos[index] = hr

	return hr, nil
}

// UpdateHelmRepoTokenCache updates the token cache for a repoistry
func (repo *HelmRepoRepository) UpdateHelmRepoTokenCache(
	tokenCache *ints.HelmRepoTokenCache,
) (*models.HelmRepo, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	index := int(tokenCache.HelmRepoID - 1)
	repo.helmRepos[index].TokenCache.Token = tokenCache.Token
	repo.helmRepos[index].TokenCache.Expiry = tokenCache.Expiry

	return repo.helmRepos[index], nil
}

// DeleteHelmRepo removes a repoistry from the array by setting it to nil
func (repo *HelmRepoRepository) DeleteHelmRepo(
	hr *models.HelmRepo,
) error {
	if !repo.canQuery {
		return errors.New("Cannot write database")
	}

	if int(hr.ID-1) >= len(repo.helmRepos) || repo.helmRepos[hr.ID-1] == nil {
		return gorm.ErrRecordNotFound
	}

	index := int(hr.ID - 1)
	repo.helmRepos[index] = nil

	return nil
}
