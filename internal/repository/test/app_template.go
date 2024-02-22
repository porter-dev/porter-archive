package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AppTemplateRepository is a test repository that implements repository.AppTemplateRepository
type AppTemplateRepository struct {
	canQuery bool
}

// NewAppTemplateRepository returns the test AppTemplateRepository
func NewAppTemplateRepository() repository.AppTemplateRepository {
	return &AppTemplateRepository{canQuery: false}
}

// AppTemplateByPorterAppID finds an app template by its porter app id
func (repo *AppTemplateRepository) AppTemplateByPorterAppID(projectID uint, appID uint) (*models.AppTemplate, error) {
	return nil, errors.New("cannot read database")
}

// CreateAppTemplate creates a new app template
func (repo *AppTemplateRepository) CreateAppTemplate(appTemplate *models.AppTemplate) (*models.AppTemplate, error) {
	return nil, errors.New("cannot write database")
}
