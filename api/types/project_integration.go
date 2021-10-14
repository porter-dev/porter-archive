package types

import "time"

// The supported oauth mechanism clients
const (
	OAuthGithub       OAuthIntegrationClient = "github"
	OAuthDigitalOcean OAuthIntegrationClient = "do"
	OAuthGoogle       OAuthIntegrationClient = "google"
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

	// The AWS arn this is integration is linked to
	AWSArn string `json:"aws_arn"`
}

type ListAWSResponse []*AWSIntegration

type CreateAWSRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSClusterID       string `json:"aws_cluster_id"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
}

type CreateAWSResponse struct {
	*AWSIntegration
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

	// The GCP project id where the service account for this auth mechanism persists
	GCPProjectID string `json:"gcp-project-id"`

	// The GCP user email that linked this service account
	GCPUserEmail string `json:"gcp-user-email"`
}

type ListGCPResponse []*GCPIntegration

type CreateGCPRequest struct {
	GCPKeyData   string `json:"gcp_key_data" form:"required"`
	GCPProjectID string `json:"gcp_project_id"`
	GCPRegion    string `json:"gcp_region"`
}

type CreateGCPResponse struct {
	*GCPIntegration
}
