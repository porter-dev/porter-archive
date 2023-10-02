package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// AppTemplateRepository represents the set of queries on the AppTemplate model
type AppTemplateRepository interface {
	// AppTemplateByPorterAppID finds an app template by its porter app id
	AppTemplateByPorterAppID(projectID, appID uint) (*models.AppTemplate, error)
	// CreateAppTemplate creates a new app template
	CreateAppTemplate(appTemplate *models.AppTemplate) (*models.AppTemplate, error)
}
