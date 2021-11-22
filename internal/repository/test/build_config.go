package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type BuildConfigRepository struct {
	canQuery     bool
	buildConfigs []*models.BuildConfig
}

func NewBuildConfigRepository(canQuery bool) repository.BuildConfigRepository {
	return &BuildConfigRepository{canQuery, []*models.BuildConfig{}}
}

func (repo *BuildConfigRepository) CreateBuildConfig(
	a *models.BuildConfig,
) (*models.BuildConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.buildConfigs = append(repo.buildConfigs, a)
	a.ID = uint(len(repo.buildConfigs))

	return a, nil
}

func (repo *BuildConfigRepository) UpdateBuildConfig(bc *models.BuildConfig) (*models.BuildConfig, error) {
	// TODO
	return bc, nil
}
