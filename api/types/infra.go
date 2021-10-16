package types

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
)

type Infra struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

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

	// The last-applied, non-sensitive input variables to the provisioner. For now,
	// this is a map[string]string since we marshal into env vars anyway, but
	// eventually this config will be more complex.
	LastApplied map[string]string `json:"last_applied"`
}
