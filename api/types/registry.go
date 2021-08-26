package types

type Registry struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the registry
	Name string `json:"name"`

	// URL of the registry
	URL string `json:"url"`

	// The integration service for this registry
	Service RegistryService `json:"service"`

	// The infra id, if registry was provisioned with Porter
	InfraID uint `json:"infra_id"`
}

type RegistryService string

const (
	GCR       RegistryService = "gcr"
	ECR       RegistryService = "ecr"
	DOCR      RegistryService = "docr"
	DockerHub RegistryService = "dockerhub"
)
