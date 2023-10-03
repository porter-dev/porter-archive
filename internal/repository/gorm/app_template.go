package gorm

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AppTemplateRepository uses gorm.DB for querying the database
type AppTemplateRepository struct {
	db *gorm.DB
}

// NewAppTemplateRepository returns a AppTemplateRepository which uses
// gorm.DB for querying the database
func NewAppTemplateRepository(db *gorm.DB) repository.AppTemplateRepository {
	return &AppTemplateRepository{db}
}

// AppTemplateByPorterAppID finds an app template by its porter app id
func (repo *AppTemplateRepository) AppTemplateByPorterAppID(projectID uint, appID uint) (*models.AppTemplate, error) {
	appTemplate := &models.AppTemplate{}

	if err := repo.db.Where("project_id = ? AND porter_app_id = ?", projectID, appID).Limit(1).Find(&appTemplate).Error; err != nil {
		return nil, err
	}

	return appTemplate, nil
}

// CreateAppTemplate creates a new app template
func (repo *AppTemplateRepository) CreateAppTemplate(appTemplate *models.AppTemplate) (*models.AppTemplate, error) {
	if appTemplate == nil {
		return nil, errors.New("app template is nil")
	}
	if appTemplate.Base64App == "" {
		return nil, errors.New("app template base64 app is empty")
	}
	if appTemplate.ProjectID == 0 {
		return nil, errors.New("app template project id is empty")
	}
	if appTemplate.PorterAppID == 0 {
		return nil, errors.New("app template porter app id is empty")
	}

	if appTemplate.ID == uuid.Nil {
		appTemplate.ID = uuid.New()
	}
	if appTemplate.CreatedAt.IsZero() {
		appTemplate.CreatedAt = time.Now().UTC()
	}
	if appTemplate.UpdatedAt.IsZero() {
		appTemplate.UpdatedAt = time.Now().UTC()
	}

	if err := repo.db.Save(appTemplate).Error; err != nil {
		return nil, err
	}

	return appTemplate, nil
}
