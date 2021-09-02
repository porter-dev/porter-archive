package types

type CreateECRInfraRequest struct {
	ECRName          string `json:"ecr_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
// func (ce *CreateECRInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:             types.InfraECR,
// 		ProjectID:        ce.ProjectID,
// 		Suffix:           stringWithCharset(6, randCharset),
// 		Status:           types.StatusCreating,
// 		AWSIntegrationID: ce.AWSIntegrationID,
// 	}, nil
// }

type CreateEKSInfraRequest struct {
	EKSName          string `json:"eks_name" form:"required"`
	MachineType      string `json:"machine_type"`
	ProjectID        uint   `json:"project_id" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
// func (ce *CreateEKSInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:             types.InfraEKS,
// 		ProjectID:        ce.ProjectID,
// 		Suffix:           stringWithCharset(6, randCharset),
// 		Status:           types.StatusCreating,
// 		AWSIntegrationID: ce.AWSIntegrationID,
// 	}, nil
// }

type CreateGCRInfraRequest struct {
	ProjectID        uint `json:"project_id" form:"required"`
	GCPIntegrationID uint `json:"gcp_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
// func (ce *CreateGCRInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:             types.InfraGCR,
// 		ProjectID:        ce.ProjectID,
// 		Suffix:           stringWithCharset(6, randCharset),
// 		Status:           types.StatusCreating,
// 		GCPIntegrationID: ce.GCPIntegrationID,
// 	}, nil
// }

type CreateGKEInfraRequest struct {
	GKEName          string `json:"gke_name" form:"required"`
	ProjectID        uint   `json:"project_id" form:"required"`
	GCPIntegrationID uint   `json:"gcp_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm aws infra model
// func (ce *CreateGKEInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:             types.InfraGKE,
// 		ProjectID:        ce.ProjectID,
// 		Suffix:           stringWithCharset(6, randCharset),
// 		Status:           types.StatusCreating,
// 		GCPIntegrationID: ce.GCPIntegrationID,
// 	}, nil
// }

type CreateDOCRInfraRequest struct {
	DOCRName             string `json:"docr_name" form:"required"`
	DOCRSubscriptionTier string `json:"docr_subscription_tier" form:"required"`
	ProjectID            uint   `json:"project_id" form:"required"`
	DOIntegrationID      uint   `json:"do_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm infra model
// func (de *CreateDOCRInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:            types.InfraDOCR,
// 		ProjectID:       de.ProjectID,
// 		Suffix:          stringWithCharset(6, randCharset),
// 		Status:          types.StatusCreating,
// 		DOIntegrationID: de.DOIntegrationID,
// 	}, nil
// }

type CreateDOKSInfraRequest struct {
	DORegion        string `json:"do_region" form:"required"`
	DOKSName        string `json:"doks_name" form:"required"`
	ProjectID       uint   `json:"project_id" form:"required"`
	DOIntegrationID uint   `json:"do_integration_id" form:"required"`
}

// ToInfra converts the form to a gorm infra model
// func (de *CreateDOKSInfra) ToInfra() (*models.Infra, error) {
// 	return &models.Infra{
// 		Kind:            types.InfraDOKS,
// 		ProjectID:       de.ProjectID,
// 		Suffix:          stringWithCharset(6, randCharset),
// 		Status:          types.StatusCreating,
// 		DOIntegrationID: de.DOIntegrationID,
// 	}, nil
// }
