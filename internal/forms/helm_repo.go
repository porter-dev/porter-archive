package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateHelmRepo represents the accepted values for creating a
// helm repo
type CreateHelmRepo struct {
	Name      string `json:"name" form:"required"`
	RepoURL   string `json:"repo_url" form:"required"`
	ProjectID uint   `json:"project_id" form:"required"`

	BasicIntegrationID uint `json:"basic_integration_id"`
	GCPIntegrationID   uint `json:"gcp_integration_id"`
	AWSIntegrationID   uint `json:"aws_integration_id"`
}

// ToHelmRepo converts the form to a gorm helm repo model
func (ch *CreateHelmRepo) ToHelmRepo() (*models.HelmRepo, error) {
	return &models.HelmRepo{
		Name:                   ch.Name,
		RepoURL:                ch.RepoURL,
		ProjectID:              ch.ProjectID,
		BasicAuthIntegrationID: ch.BasicIntegrationID,
		GCPIntegrationID:       ch.GCPIntegrationID,
		AWSIntegrationID:       ch.AWSIntegrationID,
	}, nil
}
