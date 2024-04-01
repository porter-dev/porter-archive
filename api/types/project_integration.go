package types

import "time"

// The supported oauth mechanism clients
const (
	OAuthGithub       OAuthIntegrationClient = "github"
	OAuthDigitalOcean OAuthIntegrationClient = "do"
	OAuthGoogle       OAuthIntegrationClient = "google"
	OAuthGitlab       OAuthIntegrationClient = "gitlab"
)

// OAuthIntegrationClient is the name of an OAuth mechanism client
type OAuthIntegrationClient string

// OAuthIntegration is an OAuthIntegration to be shared over REST
type OAuthIntegration struct {
	CreatedAt time.Time `json:"created_at"`

	ID uint `json:"id"`

	// The name of the auth mechanism
	Client OAuthIntegrationClient `json:"client"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// (optional) an identifying email on the target identity provider.
	// for example, for DigitalOcean this is the user's email.
	TargetEmail string `json:"target_email,omitempty"`

	// (optional) an identifying string on the target identity provider.
	// for example, for DigitalOcean this is the target project name.
	TargetName string `json:"target_id,omitempty"`
}

type ListOAuthResponse []*OAuthIntegration

type BasicIntegration struct {
	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`
}

type CreateBasicRequest struct {
	Username string `json:"username,required"`
	Password string `json:"password,required"`
}

type CreateBasicResponse struct {
	*BasicIntegration
}

type AWSIntegration struct {
	CreatedAt time.Time `json:"created_at"`

	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The AWS arn this integration is linked to
	AWSArn string `json:"aws_arn"`
}

type ListAWSResponse []*AWSIntegration

type QuotaPreflightCheckRequest struct {
	ProjectID  uint   `json:"project_id"`
	TargetARN  string `json:"target_arn"`
	ExternalID string `json:"external_id"`
	Region     string `json:"region"`
}

type QuotaPreflightCheckResponse struct{}

type CreateAWSRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSClusterID       string `json:"aws_cluster_id"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	AWSAssumeRoleArn   string `json:"aws_assume_role_arn"`
	TargetArn          string `json:"aws_target_arn"`
	ExternalID         string `json:"aws_external_id"`
}

type CreateAWSResponse struct {
	*AWSIntegration
	CloudProviderCredentialIdentifier string  `json:"cloud_provider_credentials_id"`
	PercentCompleted                  float32 `json:"percent_completed"`
}

type OverwriteAWSRequest struct {
	AWSIntegrationID   uint   `json:"aws_integration_id,required"`
	AWSAccessKeyID     string `json:"aws_access_key_id,required"`
	AWSSecretAccessKey string `json:"aws_secret_access_key,required"`
	ClusterID          uint   `json:"cluster_id"`
}

type OverwriteAWSResponse struct {
	*AWSIntegration
}

type GCPIntegration struct {
	CreatedAt time.Time `json:"created_at"`

	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The GCP service account email for this credential
	GCPSAEmail string `json:"gcp_sa_email"`

	// The GCP project id where the service account for this auth mechanism persists
	GCPProjectID string `json:"gcp_project_id"`
}

type ListGCPResponse []*GCPIntegration

type CreateGCPRequest struct {
	GCPKeyData   string `json:"gcp_key_data" form:"required"`
	GCPProjectID string `json:"gcp_project_id"`
	GCPRegion    string `json:"gcp_region"`
}

type CreateGCPResponse struct {
	*GCPIntegration
	// IsCCPCluster is true if the cluster is managed through CCP, instead of the legacy provisioner
	IsCCPCluster bool `json:"is_ccp_cluster"`
	// CloudProviderCredentialIdentifier is the identifier for the cloud provider credential for CCP clusters
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credentials_id"`
}

type AzureIntegration struct {
	CreatedAt time.Time `json:"created_at"`

	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The Azure client ID that this is linked to
	AzureClientID string `json:"azure_client_id"`

	// The Azure subscription ID that this is linked to
	AzureSubscriptionID string `json:"azure_subscription_id"`

	// The Azure tenant ID that this is linked to
	AzureTenantID string `json:"azure_tenant_id"`
}

type CreateAzureRequest struct {
	AzureClientID       string `json:"azure_client_id" form:"required"`
	AzureSubscriptionID string `json:"azure_subscription_id" form:"required"`
	AzureTenantID       string `json:"azure_tenant_id" form:"required"`
	ServicePrincipalKey string `json:"service_principal_key" form:"required"`
}

type CreateAzureResponse struct {
	*AzureIntegration
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credentials_id"`
}

type ListAzureResponse []*AzureIntegration

type GitlabIntegration struct {
	CreatedAt time.Time `json:"created_at"`

	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	InstanceURL string `json:"instance_url"`
}

type GitlabIntegrationWithUsername struct {
	GitlabIntegration
	Username string `json:"username"`
}

type ListGitlabResponse []*GitlabIntegrationWithUsername

type CreateGitlabRequest struct {
	InstanceURL     string `json:"instance_url"`
	AppClientID     string `json:"client_id"`
	AppClientSecret string `json:"client_secret"`
}

type CreateGitlabResponse struct {
	*GitlabIntegration
}

type GitIntegration struct {
	Provider       string `json:"provider" form:"required"`
	Name           string `json:"name,omitempty"`
	InstallationID int64  `json:"installation_id,omitempty"`
	InstanceURL    string `json:"instance_url,omitempty"`
	IntegrationID  uint   `json:"integration_id,omitempty"`
}

type ListGitIntegrationResponse []*GitIntegration
