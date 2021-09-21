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
}
