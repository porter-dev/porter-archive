package test

import (
	"errors"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type RevisionRepository struct {
	canQuery       bool
	failingMethods string
}

func NewRevisionRepository(canQuery bool, failingMethods ...string) repository.RevisionRepository {
	return &RevisionRepository{canQuery, strings.Join(failingMethods, ",")}
}

func (repo *RevisionRepository) CreateRevision(revision *models.Revision) (*models.Revision, error) {
	return nil, errors.New("cannot write database")
}

func (repo *RevisionRepository) GetLatestRevision(appName string) (*models.Revision, error) {
	return nil, errors.New("cannot write database")
}
