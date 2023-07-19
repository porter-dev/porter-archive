package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type EnvironmentConfigRepository struct {
	canQuery       bool
	failingMethods string
}

func NewEnvironmentConfigRepository(canQuery bool, failingMethods ...string) repository.EnvironmentConfigRepository {
	return &EnvironmentConfigRepository{canQuery, strings.Join(failingMethods, ",")}
}

func (repo *EnvironmentConfigRepository) ReadEnvironmentConfig(projectID, clusterID, id uint) (*models.EnvironmentConfig, error) {
	return nil, errors.New("cannot write database")
}

func (repo *EnvironmentConfigRepository) ReadDefaultEnvironmentConfig(projectID, clusterID uint) (*models.EnvironmentConfig, error) {
	return nil, errors.New("cannot write database")
}
