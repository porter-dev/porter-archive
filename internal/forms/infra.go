package forms

import (
	cmdutils "github.com/porter-dev/porter/cli/cmd/utils"
	"github.com/porter-dev/porter/internal/models"
)

const randCharset string = "abcdefghijklmnopqrstuvwxyz1234567890"

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
		Suffix:           cmdutils.StringWithCharset(6, randCharset),
		Status:           models.StatusCreating,
		AWSIntegrationID: ce.AWSIntegrationID,
	}, nil
}

// CreateEKSInfra represents the accepted values for creating an
// EKS infra via the provisioning container
type CreateEKSInfra struct {
	EKSName          string `json:"eks_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToAWSInfra converts the form to a gorm aws infra model
func (ce *CreateEKSInfra) ToAWSInfra() (*models.AWSInfra, error) {
	return &models.AWSInfra{
		Kind:             models.AWSInfraEKS,
		ProjectID:        ce.ProjectID,
		Suffix:           cmdutils.StringWithCharset(6, randCharset),
		Status:           models.StatusCreating,
		AWSIntegrationID: ce.AWSIntegrationID,
	}, nil
}
