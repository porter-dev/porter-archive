package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

// AppInstanceRepository uses gorm.DB for querying the database
type AppInstanceRepository struct {
	db *gorm.DB
}

// NewAppInstanceRepository returns a AppInstanceRepository which uses
// gorm.DB for querying the database
func NewAppInstanceRepository(db *gorm.DB) repository.AppInstanceRepository {
	return &AppInstanceRepository{db}
}

// Get returns an app instance by its id
func (repo *AppInstanceRepository) Get(ctx context.Context, id string) (*models.AppInstance, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-get-app-instance")
	defer span.End()

	appInstance := &models.AppInstance{}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "app-instance-id", Value: id})
	if id == "" {
		return nil, telemetry.Error(ctx, span, nil, "id is empty")
	}

	if err := repo.db.Where("id = ?", id).First(&appInstance).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting app instance")
	}

	return appInstance, nil
}

// FromNameAndDeploymentTargetId returns an app instance by its name and deployment target id
func (repo *AppInstanceRepository) FromNameAndDeploymentTargetId(ctx context.Context, name string, deploymentTargetId string) (*models.AppInstance, error) {
	ctx, span := telemetry.NewSpan(ctx, "from-name-and-deployment-target-id")
	defer span.End()

	appInstance := &models.AppInstance{}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "name", Value: name},
		telemetry.AttributeKV{Key: "deployment", Value: deploymentTargetId},
	)

	if err := repo.db.Where("name = ? and deployment_target_id = ?", name, deploymentTargetId).First(&appInstance).Error; err != nil {
		return nil, telemetry.Error(ctx, span, err, "error getting app instance")
	}

	return appInstance, nil
}
