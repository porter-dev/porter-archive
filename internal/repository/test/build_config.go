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
	bc *models.BuildConfig,
) (*models.BuildConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	repo.buildConfigs = append(repo.buildConfigs, bc)
	bc.ID = uint(len(repo.buildConfigs))

	return bc, nil
}

func (repo *BuildConfigRepository) UpdateBuildConfig(bc *models.BuildConfig) (*models.BuildConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	// TODO
	return bc, nil
}

func (repo *BuildConfigRepository) GetBuildConfig(id uint) (*models.BuildConfig, error) {
	if !repo.canQuery {
		return nil, errors.New("cannot write database")
	}

	// TODO
	return nil, nil
}
