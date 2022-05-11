package types

import "time"

const (
	URLParamRegion URLParam = "region"
)

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

	// The AWS integration that was used to create or connect the registry
	AWSIntegrationID uint `json:"aws_integration_id,omitempty"`

	// The Azure integration that was used to create or connect the registry
	AzureIntegrationID uint `json:"azure_integration_id,omitempty"`

	// The GCP integration that was used to create or connect the registry
	GCPIntegrationID uint `json:"gcp_integration_id,omitempty"`

	// The DO integration that was used to create or connect the registry:
	// this points to an OAuthIntegrationID
	DOIntegrationID uint `json:"do_integration_id,omitempty"`

	// The basic integration that was used to connect the registry:
	BasicIntegrationID uint `json:"basic_integration_id,omitempty"`
}

// Repository is a collection of images
type RegistryRepository struct {
	// Name of the repository
	Name string `json:"name"`

	// When the repository was created
	CreatedAt time.Time `json:"created_at,omitempty"`

	// The URI of the repository
	URI string `json:"uri"`
}

// Image is a Docker image type
type Image struct {
	// The sha256 digest of the image manifest.
	Digest string `json:"digest"`

	// The tag used for the image.
	Tag string `json:"tag"`

	// The image manifest associated with the image.
	Manifest string `json:"manifest"`

	// The name of the repository associated with the image.
	RepositoryName string `json:"repository_name"`

	// When the image was pushed
	PushedAt *time.Time `json:"pushed_at"`
}

type RegistryService string

const (
	GCR       RegistryService = "gcr"
	ECR       RegistryService = "ecr"
	ACR       RegistryService = "acr"
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
	AzureIntegrationID uint   `json:"azure_integration_id"`

	// Additional Azure-specific fields
	ACRResourceGroupName string `json:"acr_resource_group_name"`
	ACRName              string `json:"acr_name"`
}

type CreateRegistryRepositoryRequest struct {
	ImageRepoURI string `json:"image_repo_uri" form:"required"`
}

// UpdateRegistryRequest represents the accepted values for updating a
// registry (only name for now)
type UpdateRegistryRequest struct {
	Name string `json:"name" form:"required"`
}

type GetRegistryTokenResponse struct {
	Token     string     `json:"token"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type GetRegistryGCRTokenRequest struct {
	ServerURL string `schema:"server_url"`
}

type GetRegistryECRTokenRequest struct {
	Region    string `schema:"region"`
	AccountID string `schema:"account_id"`
}

type GetRegistryDOCRTokenRequest struct {
	ServerURL string `schema:"server_url"`
}

type ListRegistryRepositoryResponse []*RegistryRepository

type ListImageResponse []*Image
