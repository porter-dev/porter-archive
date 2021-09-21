package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ReleaseRepository implements repository.ReleaseRepository
type ReleaseRepository struct {
	canQuery bool
	releases []*models.Release
}

// NewReleaseRepository will return errors if canQuery is false
func NewReleaseRepository(canQuery bool) repository.ReleaseRepository {
	return &ReleaseRepository{
		canQuery,
		[]*models.Release{},
	}
}

// CreateRelease creates a new release
func (repo *ReleaseRepository) CreateRelease(
	release *models.Release,
) (*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if release == nil {
		return nil, nil
	}

	repo.releases = append(repo.releases, release)
	release.ID = uint(len(repo.releases))

	return release, nil
}

// ReadRelease finds a release by id
func (repo *ReleaseRepository) ReadReleaseByWebhookToken(
	token string,
) (*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, release := range repo.releases {
		if release != nil && release.WebhookToken == token {
			return release, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// ReadRelease finds a release by id
func (repo *ReleaseRepository) ReadRelease(
	clusterID uint, name, namespace string,
) (*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	for _, release := range repo.releases {
		if release != nil && release.ClusterID == clusterID && release.Name == name && release.Namespace == namespace {
			return release, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

// ListReleasesByProjectID finds all releases for a given project id
func (repo *ReleaseRepository) ListReleasesByImageRepoURI(
	clusterID uint, imageRepoURI string,
) ([]*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	res := make([]*models.Release, 0)

	for _, release := range repo.releases {
		if release != nil && release.ClusterID == clusterID && release.ImageRepoURI == imageRepoURI {
			res = append(res, release)
		}
	}

	return res, nil
}

// UpdateRelease modifies an existing Release in the database
func (repo *ReleaseRepository) UpdateRelease(
	release *models.Release,
) (*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(release.ID-1) >= len(repo.releases) || repo.releases[release.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(release.ID - 1)
	repo.releases[index] = release

	return release, nil
}

// DeleteRelease removes a release from the array by setting it to nil
func (repo *ReleaseRepository) DeleteRelease(
	release *models.Release,
) (*models.Release, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(release.ID-1) >= len(repo.releases) || repo.releases[release.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(release.ID - 1)
	copy := repo.releases[index]
	repo.releases[index] = nil

	return copy, nil
}
