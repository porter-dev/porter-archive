package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateRegistry represents the accepted values for creating a
// registry
type CreateRegistry struct {
	Name             string `json:"name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	GCPIntegrationID uint   `json:"gcp_integration_id"`
	AWSIntegrationID uint   `json:"aws_integration_id"`
}

// ToRegistry converts the form to a gorm registry model
func (cr *CreateRegistry) ToRegistry() (*models.Registry, error) {
	return &models.Registry{
		Name:             cr.Name,
		ProjectID:        cr.ProjectID,
		GCPIntegrationID: cr.GCPIntegrationID,
		AWSIntegrationID: cr.AWSIntegrationID,
	}, nil
}
