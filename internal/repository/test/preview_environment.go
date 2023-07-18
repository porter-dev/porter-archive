package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type PreviewEnvironmentRepository struct {
	canQuery       bool
	failingMethods string
}

func NewPreviewEnvironmentRepository(canQuery bool, failingMethods ...string) repository.PreviewEnvironmentRepository {
	return &PreviewEnvironmentRepository{canQuery, strings.Join(failingMethods, ",")}
}

func (repo *PreviewEnvironmentRepository) CreatePreviewEnvironment(a *models.PreviewEnvironment) (*models.PreviewEnvironment, error) {
	return nil, errors.New("cannot write database")
}
