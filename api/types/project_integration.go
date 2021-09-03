package types

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
	ID uint `json:"id"`

	// The id of the user that linked this auth mechanism
	UserID uint `json:"user_id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The AWS arn this is integration is linked to
	AWSArn string `json:"aws_arn"`
}

type CreateAWSRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSClusterID       string `json:"aws_cluster_id"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
}

type CreateAWSResponse struct {
	*AWSIntegration
}
