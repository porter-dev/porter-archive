package credentials

import "github.com/porter-dev/porter/internal/models/integrations"

type OAuthCredential struct {
	// The ID issued to the client
	ClientID []byte `json:"client_id"`

	// The end-users's access token
	AccessToken []byte `json:"access_token"`

	// The end-user's refresh token
	RefreshToken []byte `json:"refresh_token"`
}

type GCPCredential struct {
	// KeyData for a service account for GCP connectors
	GCPKeyData []byte `json:"gcp_key_data"`
}

type AWSCredential struct {
	// The AWS cluster ID
	// See https://github.com/kubernetes-sigs/aws-iam-authenticator#what-is-a-cluster-id
	AWSClusterID []byte `json:"aws_cluster_id"`

	// The AWS access key for this IAM user
	AWSAccessKeyID []byte `json:"aws_access_key_id"`

	// The AWS secret key for this IAM user
	AWSSecretAccessKey []byte `json:"aws_secret_access_key"`

	// An optional session token, if the user is assuming a role
	AWSSessionToken []byte `json:"aws_session_token"`
}

type CredentialStorage interface {
	WriteOAuthCredential(oauthIntegration *integrations.OAuthIntegration, data *OAuthCredential) error
	GetOAuthCredential(oauthIntegration *integrations.OAuthIntegration) (*OAuthCredential, error)
	CreateOAuthToken(oauthIntegration *integrations.OAuthIntegration) (string, error)
	WriteGCPCredential(gcpIntegration *integrations.GCPIntegration, data *GCPCredential) error
	GetGCPCredential(gcpIntegration *integrations.GCPIntegration) (*GCPCredential, error)
	CreateGCPToken(gcpIntegration *integrations.GCPIntegration) (string, error)
	WriteAWSCredential(awsIntegration *integrations.AWSIntegration, data *AWSCredential) error
	GetAWSCredential(awsIntegration *integrations.AWSIntegration) (*AWSCredential, error)
	CreateAWSToken(awsIntegration *integrations.AWSIntegration) (string, error)
}
