package forms

import (
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// CreateRegistry represents the accepted values for creating a
// registry
type CreateRegistry struct {
	Name               string `json:"name" form:"required"`
	ProjectID          uint   `json:"project_id" form:"required"`
	URL                string `json:"url"`
	GCPIntegrationID   uint   `json:"gcp_integration_id"`
	AWSIntegrationID   uint   `json:"aws_integration_id"`
	DOIntegrationID    uint   `json:"do_integration_id"`
	BasicIntegrationID uint   `json:"basic_integration_id"`
}

// ToRegistry converts the form to a gorm registry model
func (cr *CreateRegistry) ToRegistry(repo repository.Repository) (*models.Registry, error) {
	registry := &models.Registry{
		Name:               cr.Name,
		ProjectID:          cr.ProjectID,
		URL:                cr.URL,
		GCPIntegrationID:   cr.GCPIntegrationID,
		AWSIntegrationID:   cr.AWSIntegrationID,
		DOIntegrationID:    cr.DOIntegrationID,
		BasicIntegrationID: cr.BasicIntegrationID,
	}

	if registry.URL == "" && registry.AWSIntegrationID != 0 {
		awsInt, err := repo.AWSIntegration.ReadAWSIntegration(registry.AWSIntegrationID)

		if err != nil {
			return nil, err
		}

		sess, err := awsInt.GetSession()

		if err != nil {
			return nil, err
		}

		ecrSvc := ecr.New(sess)

		output, err := ecrSvc.GetAuthorizationToken(&ecr.GetAuthorizationTokenInput{})

		if err != nil {
			return nil, err
		}

		registry.URL = *output.AuthorizationData[0].ProxyEndpoint
	}

	return registry, nil
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
