package types

import "time"

const (
	URLParamRegion URLParam = "region"
)

type Registry struct {
	// The ID of the registry
	// minimum: 1
	// example: 2
	ID uint `json:"id"`

	// The project that this integration belongs to
	// minimum: 1
	// example: 1
	ProjectID uint `json:"project_id"`

	// Name of the registry
	// example: my-ecr-reg
	Name string `json:"name"`

	// URL of the registry
	// example: 123456789.dkr.ecr.us-west-2.amazonaws.com
	URL string `json:"url"`

	// The integration service for this registry
	// enum: gcr,ecr,acr,docr,dockerhub
	// example: ecr
	Service string `json:"service"`

	// The infra id, if registry was provisioned with Porter
	// minimum: 1
	// example: 2
	InfraID uint `json:"infra_id"`

	// The AWS integration that was used to create or connect the registry
	// minimum: 1
	// example: 1
	AWSIntegrationID uint `json:"aws_integration_id,omitempty"`

	// The Azure integration that was used to create or connect the registry
	// minimum: 1
	// example: 0
	AzureIntegrationID uint `json:"azure_integration_id,omitempty"`

	// The GCP integration that was used to create or connect the registry
	// minimum: 1
	// example: 0
	GCPIntegrationID uint `json:"gcp_integration_id,omitempty"`

	// The DO integration that was used to create or connect the registry:
	// this points to an OAuthIntegrationID
	// minimum: 1
	// example: 0
	DOIntegrationID uint `json:"do_integration_id,omitempty"`

	// The basic integration that was used to connect the registry.
	// minimum: 1
	// example: 0
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

// Type of registry service
type RegistryService string

const (
	GCR       RegistryService = "gcr"
	ECR       RegistryService = "ecr"
	ACR       RegistryService = "acr"
	DOCR      RegistryService = "docr"
	DockerHub RegistryService = "dockerhub"
)

// swagger:model ListRegistriesResponse
type RegistryListResponse []Registry

// swagger:model
type CreateRegistryRequest struct {
	// URL of the container registry
	// example: 123456789.dkr.ecr.us-west-2.amazonaws.com
	URL string `json:"url"`

	// Name of the container registry
	// required: true
	// example: my-ecr-reg
	Name string `json:"name" form:"required"`

	// The GCP integration ID to be used for this registry
	// minimum: 1
	// example: 0
	GCPIntegrationID uint `json:"gcp_integration_id"`

	// The AWS integration ID to be used for this registry
	// minimum: 1
	// example: 1
	AWSIntegrationID uint `json:"aws_integration_id"`

	// The DigitalOcean integration ID to be used for this registry
	// minimum: 1
	// example: 0
	DOIntegrationID uint `json:"do_integration_id"`

	// The Basic integration ID to be used for this registry
	// minimum: 1
	// example: 0
	BasicIntegrationID uint `json:"basic_integration_id"`

	// The Azure integration ID to be used for this registry
	// minimum: 1
	// example: 0
	AzureIntegrationID uint `json:"azure_integration_id"`

	// Additional Azure-specific fields

	// ACR resource group name (**Azure only**)
	ACRResourceGroupName string `json:"acr_resource_group_name"`

	// ACR name (**Azure only**)
	ACRName string `json:"acr_name"`
}

// swagger:model
type CreateRegistryResponse Registry

// swagger:model
type GetRegistryResponse Registry

// swagger:model
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

// swagger:model ListRegistryRepositoriesResponse
type ListRegistryRepositoryResponse []*RegistryRepository

// swagger:model ListImagesResponse
type ListImageResponse []*Image

type V1ListImageRequest struct {
	Num      int64  `schema:"num"`
	Next     string `schema:"next"`
	NextPage uint   `schema:"next_page"`
}

// swagger:model V1ListImageResponse
type V1ListImageResponse struct {
	// The list of repository images with tags
	Images []*Image `json:"images" form:"required"`

	// The next page number used for pagination, when applicable
	NextPage uint `json:"num_page,omitempty"`

	// The next page string used for pagination, when application
	Next string `json:"next,omitempty"`
}
