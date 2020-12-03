package forms

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
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

// UpdateRegistryForm represents the accepted values for updating a
// registry (only name for now)
type UpdateRegistryForm struct {
	ID uint

	Name string `json:"name" form:"required"`
}

// ToRegistry converts the form to a cluster
func (urf *UpdateRegistryForm) ToRegistry(repo repository.RegistryRepository) (*models.Registry, error) {
	registry, err := repo.ReadRegistry(urf.ID)

	if err != nil {
		return nil, err
	}

	registry.Name = urf.Name

	return registry, nil
}
