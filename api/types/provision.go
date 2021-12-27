package types

type CreateECRInfraRequest struct {
	ECRName          string `json:"ecr_name" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

type CreateEKSInfraRequest struct {
	EKSName          string `json:"eks_name" form:"required"`
	MachineType      string `json:"machine_type"`
	IssuerEmail      string `json:"issuer_email" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	AWSIntegrationID uint   `json:"aws_integration_id" form:"required"`
}

type CreateGCRInfraRequest struct {
	ProjectID        uint `json:"-" form:"required"`
	GCPIntegrationID uint `json:"gcp_integration_id" form:"required"`
}

type CreateGKEInfraRequest struct {
	GKEName          string `json:"gke_name" form:"required"`
	GCPRegion        string `json:"gcp_region" form:"required"`
	IssuerEmail      string `json:"issuer_email" form:"required"`
	ProjectID        uint   `json:"-" form:"required"`
	GCPIntegrationID uint   `json:"gcp_integration_id" form:"required"`
}

type CreateDOCRInfraRequest struct {
	DOCRName             string `json:"docr_name" form:"required"`
	DOCRSubscriptionTier string `json:"docr_subscription_tier" form:"required"`
	ProjectID            uint   `json:"-" form:"required"`
	DOIntegrationID      uint   `json:"do_integration_id" form:"required"`
}

type CreateDOKSInfraRequest struct {
	DORegion        string `json:"do_region" form:"required"`
	IssuerEmail     string `json:"issuer_email" form:"required"`
	DOKSName        string `json:"doks_name" form:"required"`
	ProjectID       uint   `json:"-" form:"required"`
	DOIntegrationID uint   `json:"do_integration_id" form:"required"`
}

type DeleteInfraRequest struct {
	Name string `json:"name" form:"required"`
}

type CreateRDSInfraRequest struct {
	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	// version of the postgres engine
	DBEngineVersion string `json:"db_engine_version"`
	// db type - postgress / mysql
	DBFamily string `json:"db_family"`

	// Deprecated, use DBEngineVersion instead
	// PGVersion string `json:"pg_version"`

	// db instance credentials specifications
	DBName   string `json:"db_name"`
	Username string `json:"username"`
	Password string `json:"password"`

	MachineType  string `json:"machine_type"`
	DBStorage    string `json:"db_allocated_storage"`
	DBMaxStorage string `json:"db_max_allocated_storage"`
	DBEncryption bool   `json:"db_storage_encrypted"`

	// Deprecated, use DBStorage and DBMaxStorage fields instead
	// Size string `json:"size"`
}
