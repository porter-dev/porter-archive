package forms

import (
	"math/rand"
	"time"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

const randCharset string = "abcdefghijklmnopqrstuvwxyz1234567890"

// CreateTestInfra represents the accepted values for creating test
// infra via the provisioning container
type CreateTestInfra struct {
	ProjectID uint `json:"project_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
func (ce *CreateTestInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:      types.InfraTest,
		ProjectID: ce.ProjectID,
		Suffix:    stringWithCharset(6, randCharset),
		Status:    types.StatusCreating,
	}, nil
}

// CreateECRInfra represents the accepted values for creating an
// ECR infra via the provisioning container
type CreateECRInfra struct {
	ECRName          string `json:"ecr_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
func (ce *CreateECRInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:             types.InfraECR,
		ProjectID:        ce.ProjectID,
		Suffix:           stringWithCharset(6, randCharset),
		Status:           types.StatusCreating,
		AWSIntegrationID: ce.AWSIntegrationID,
	}, nil
}

// CreateEKSInfra represents the accepted values for creating an
// EKS infra via the provisioning container
type CreateEKSInfra struct {
	EKSName          string `json:"eks_name" form:"required"`
	MachineType      string `json:"machine_type"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
func (ce *CreateEKSInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:             types.InfraEKS,
		ProjectID:        ce.ProjectID,
		Suffix:           stringWithCharset(6, randCharset),
		Status:           types.StatusCreating,
		AWSIntegrationID: ce.AWSIntegrationID,
	}, nil
}

// CreateGCRInfra represents the accepted values for creating an
// GCR infra via the provisioning container
type CreateGCRInfra struct {
	ProjectID        uint `json:"project_id" form:"required"`
	GCPIntegrationID uint `json:"gcp_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
func (ce *CreateGCRInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:             types.InfraGCR,
		ProjectID:        ce.ProjectID,
		Suffix:           stringWithCharset(6, randCharset),
		Status:           types.StatusCreating,
		GCPIntegrationID: ce.GCPIntegrationID,
	}, nil
}

// CreateGKEInfra represents the accepted values for creating a
// GKE infra via the provisioning container
type CreateGKEInfra struct {
	GKEName          string `json:"gke_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	GCPIntegrationID uint   `json:"gcp_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
func (ce *CreateGKEInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:             types.InfraGKE,
		ProjectID:        ce.ProjectID,
		Suffix:           stringWithCharset(6, randCharset),
		Status:           types.StatusCreating,
		GCPIntegrationID: ce.GCPIntegrationID,
	}, nil
}

// CreateDOCRInfra represents the accepted values for creating an
// DOCR infra via the provisioning container
type CreateDOCRInfra struct {
	DOCRName             string `json:"docr_name" form:"required"`
	DOCRSubscriptionTier string `json:"docr_subscription_tier" form:"required"`
	ProjectID            uint   `json:"project_id" form:"required"`
	DOIntegrationID      uint   `json:"do_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm infra model
func (de *CreateDOCRInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:            types.InfraDOCR,
		ProjectID:       de.ProjectID,
		Suffix:          stringWithCharset(6, randCharset),
		Status:          types.StatusCreating,
		DOIntegrationID: de.DOIntegrationID,
	}, nil
}

// CreateDOKSInfra represents the accepted values for creating a
// DOKS infra via the provisioning container
type CreateDOKSInfra struct {
	DORegion        string `json:"do_region" form:"required"`
	DOKSName        string `json:"doks_name" form:"required"`
	ProjectID       uint   `json:"project_id" form:"required"`
	DOIntegrationID uint   `json:"do_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm infra model
func (de *CreateDOKSInfra) ToInfra() (*models.Infra, error) {
	return &models.Infra{
		Kind:            types.InfraDOKS,
		ProjectID:       de.ProjectID,
		Suffix:          stringWithCharset(6, randCharset),
		Status:          types.StatusCreating,
		DOIntegrationID: de.DOIntegrationID,
	}, nil
}

// DestroyECRInfra represents the accepted values for destroying an
// ECR infra via the provisioning container
type DestroyECRInfra struct {
	ECRName string `json:"ecr_name" form:"required"`
}

// DestroyEKSInfra represents the accepted values for destroying an
// EKS infra via the provisioning container
type DestroyEKSInfra struct {
	EKSName string `json:"eks_name" form:"required"`
}

// DestroyGKEInfra represents the accepted values for destroying an
// GKE infra via the provisioning container
type DestroyGKEInfra struct {
	GKEName string `json:"gke_name" form:"required"`
}

// DestroyDOCRInfra represents the accepted values for destroying an
// DOCR infra via the provisioning container
type DestroyDOCRInfra struct {
	DOCRName string `json:"docr_name" form:"required"`
}

// DestroyDOKSInfra represents the accepted values for destroying an
// DOKS infra via the provisioning container
type DestroyDOKSInfra struct {
	DOKSName string `json:"doks_name" form:"required"`
}

// helpers for random string
var seededRand *rand.Rand = rand.New(
	rand.NewSource(time.Now().UnixNano()))

// stringWithCharset returns a random string by pulling from a given charset
func stringWithCharset(length int, charset string) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}
