package types

import "time"

// InfraStatus is the status that an infrastructure can take
type InfraStatus string

// The allowed statuses
const (
	StatusCreating   InfraStatus = "creating"
	StatusCreated    InfraStatus = "created"
	StatusError      InfraStatus = "error"
	StatusDestroying InfraStatus = "destroying"
	StatusDestroyed  InfraStatus = "destroyed"
)

// InfraKind is the kind that infra can be
type InfraKind string

// The supported infra kinds
const (
	InfraTest InfraKind = "test"
	InfraECR  InfraKind = "ecr"
	InfraEKS  InfraKind = "eks"
	InfraGCR  InfraKind = "gcr"
	InfraGKE  InfraKind = "gke"
	InfraDOCR InfraKind = "docr"
	InfraDOKS InfraKind = "doks"
	InfraAKS  InfraKind = "aks"
	InfraACR  InfraKind = "acr"

	InfraRDS InfraKind = "rds"
	InfraS3  InfraKind = "s3"
)

type Infra struct {
	ID uint `json:"id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	Name string `json:"name"`

	APIVersion    string `json:"api_version,omitempty"`
	SourceLink    string `json:"source_link,omitempty"`
	SourceVersion string `json:"source_version,omitempty"`

	// The type of infra that was provisioned
	Kind InfraKind `json:"kind"`

	// Status is the status of the infra
	Status InfraStatus `json:"status"`

	// The AWS integration that was used to create the infra
	AWSIntegrationID uint `json:"aws_integration_id,omitempty"`

	// The GCP integration that was used to create the infra
	GCPIntegrationID uint `json:"gcp_integration_id,omitempty"`

	// The DO integration that was used to create the infra:
	// this points to an OAuthIntegrationID
	DOIntegrationID uint `json:"do_integration_id,omitempty"`

	// The Azure integration that was used to create the infra
	AzureIntegrationID uint `json:"azure_integration_id,omitempty"`

	// The last-applied, non-sensitive input variables to the provisioner. For now,
	// this is a map[string]string since we marshal into env vars anyway, but
	// eventually this config will be more complex.
	LastApplied map[string]string `json:"last_applied"`

	// LatestOperation is the last operation that was run against this infra, if
	// one exists
	LatestOperation *Operation `json:"latest_operation"`
}

type InfraCredentials struct {
	AWSIntegrationID   uint `json:"aws_integration_id,omitempty"`
	GCPIntegrationID   uint `json:"gcp_integration_id,omitempty"`
	DOIntegrationID    uint `json:"do_integration_id,omitempty"`
	AzureIntegrationID uint `json:"azure_integration_id,omitempty"`
}

type CreateInfraRequest struct {
	*InfraCredentials

	ClusterID uint                   `json:"cluster_id"`
	Kind      string                 `json:"kind" form:"required"`
	Values    map[string]interface{} `json:"values" form:"required"`
}

type ListInfraRequest struct {
	Version string `schema:"version"`
}

type DeleteInfraRequest struct {
	*InfraCredentials
}

type RetryInfraRequest struct {
	// Integration IDs are not required -- if they are passed in, they will override the
	// existing integration IDs
	*InfraCredentials

	// Values are not required -- if they are not passed in, the values will be
	// automatically populated from the previous operation
	Values map[string]interface{} `json:"values"`
}

type OperationMeta struct {
	LastUpdated time.Time `json:"last_updated"`
	UID         string    `json:"id"`
	InfraID     uint      `json:"infra_id"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	Errored     bool      `json:"errored"`
	Error       string    `json:"error"`
}

type Operation struct {
	*OperationMeta

	LastApplied map[string]interface{} `json:"last_applied"`
	Form        *FormYAML              `json:"form"`
}

type InfraTemplateMeta struct {
	Icon               string `json:"icon"`
	Description        string `json:"description"`
	Name               string `json:"name"`
	Version            string `json:"version"`
	Kind               string `json:"kind"`
	RequiredCredential string `json:"required_credential"`
}

type InfraTemplate struct {
	*InfraTemplateMeta

	Form *FormYAML `json:"form"`
}
