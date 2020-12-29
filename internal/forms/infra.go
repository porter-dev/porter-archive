package forms

import (
	"github.com/porter-dev/porter/internal/models"
)

// CreateECRInfra represents the accepted values for creating an
// ECR infra via the provisioning container
type CreateECRInfra struct {
	ECRName          string `json:"ecr_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToAWSInfra converts the form to a gorm aws infra model
func (ce *CreateECRInfra) ToAWSInfra() (*models.AWSInfra, error) {
	return &models.AWSInfra{
		Kind:             models.AWSInfraECR,
		ProjectID:        ce.ProjectID,
		Status:           models.StatusCreating,
		AWSIntegrationID: ce.AWSIntegrationID,
	}, nil
}
