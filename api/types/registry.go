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

type RegistryListResponse []Registry

type CreateRegistryRequest struct {
	URL                string `json:"url"`
	Name               string `json:"name" form:"required"`
	GCPIntegrationID   uint   `json:"gcp_integration_id"`
	AWSIntegrationID   uint   `json:"aws_integration_id"`
	DOIntegrationID    uint   `json:"do_integration_id"`
	BasicIntegrationID uint   `json:"basic_integration_id"`
}

type CreateRegistryRepositoryRequest struct {
	ImageRepoURI string `json:"image_repo_uri" form:"required"`
}

// UpdateRegistryRequest represents the accepted values for updating a
// registry (only name for now)
type UpdateRegistryRequest struct {
	Name string `json:"name" form:"required"`
}
