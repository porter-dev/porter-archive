package repository

import (
	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// KubeIntegrationRepository represents the set of queries on the OIDC auth
// mechanism
type KubeIntegrationRepository interface {
	CreateKubeIntegration(am *ints.KubeIntegration) (*ints.KubeIntegration, error)
	ReadKubeIntegration(projectID, id uint) (*ints.KubeIntegration, error)
	ListKubeIntegrationsByProjectID(projectID uint) ([]*ints.KubeIntegration, error)
}

// BasicIntegrationRepository represents the set of queries on the "basic" auth
// mechanism
type BasicIntegrationRepository interface {
	CreateBasicIntegration(am *ints.BasicIntegration) (*ints.BasicIntegration, error)
	ReadBasicIntegration(projectID, id uint) (*ints.BasicIntegration, error)
	ListBasicIntegrationsByProjectID(projectID uint) ([]*ints.BasicIntegration, error)
}

// OIDCIntegrationRepository represents the set of queries on the OIDC auth
// mechanism
type OIDCIntegrationRepository interface {
	CreateOIDCIntegration(am *ints.OIDCIntegration) (*ints.OIDCIntegration, error)
	ReadOIDCIntegration(projectID, id uint) (*ints.OIDCIntegration, error)
	ListOIDCIntegrationsByProjectID(projectID uint) ([]*ints.OIDCIntegration, error)
}

// OAuthIntegrationRepository represents the set of queries on the oauth
// mechanism
type OAuthIntegrationRepository interface {
	CreateOAuthIntegration(am *ints.OAuthIntegration) (*ints.OAuthIntegration, error)
	ReadOAuthIntegration(projectID, id uint) (*ints.OAuthIntegration, error)
	ListOAuthIntegrationsByProjectID(projectID uint) ([]*ints.OAuthIntegration, error)
	UpdateOAuthIntegration(am *ints.OAuthIntegration) (*ints.OAuthIntegration, error)
}

// GithubAppOAuthIntegrationRepository represents the set of queries on the oauth
// mechanism
type GithubAppOAuthIntegrationRepository interface {
	CreateGithubAppOAuthIntegration(am *ints.GithubAppOAuthIntegration) (*ints.GithubAppOAuthIntegration, error)
	ReadGithubAppOauthIntegration(id uint) (*ints.GithubAppOAuthIntegration, error)
	UpdateGithubAppOauthIntegration(am *ints.GithubAppOAuthIntegration) (*ints.GithubAppOAuthIntegration, error)
}

// SlackIntegrationRepository represents the set of queries on a Slack integration
type SlackIntegrationRepository interface {
	CreateSlackIntegration(slackInt *ints.SlackIntegration) (*ints.SlackIntegration, error)
	ListSlackIntegrationsByProjectID(projectID uint) ([]*ints.SlackIntegration, error)
	DeleteSlackIntegration(integrationID uint) error
}

// AWSIntegrationRepository represents the set of queries on the AWS auth
// mechanism
type AWSIntegrationRepository interface {
	CreateAWSIntegration(am *ints.AWSIntegration) (*ints.AWSIntegration, error)
	OverwriteAWSIntegration(am *ints.AWSIntegration) (*ints.AWSIntegration, error)
	ReadAWSIntegration(projectID, id uint) (*ints.AWSIntegration, error)
	ListAWSIntegrationsByProjectID(projectID uint) ([]*ints.AWSIntegration, error)
}

// AzureIntegrationRepository represents the set of queries on the AWS auth
// mechanism
type AzureIntegrationRepository interface {
	CreateAzureIntegration(az *ints.AzureIntegration) (*ints.AzureIntegration, error)
	OverwriteAzureIntegration(az *ints.AzureIntegration) (*ints.AzureIntegration, error)
	ReadAzureIntegration(projectID, id uint) (*ints.AzureIntegration, error)
	ListAzureIntegrationsByProjectID(projectID uint) ([]*ints.AzureIntegration, error)
}

// GCPIntegrationRepository represents the set of queries on the GCP auth
// mechanism
type GCPIntegrationRepository interface {
	CreateGCPIntegration(am *ints.GCPIntegration) (*ints.GCPIntegration, error)
	ReadGCPIntegration(projectID, id uint) (*ints.GCPIntegration, error)
	ListGCPIntegrationsByProjectID(projectID uint) ([]*ints.GCPIntegration, error)
}

// GithubAppInstallationRepository represents the set of queries for github app installations
type GithubAppInstallationRepository interface {
	CreateGithubAppInstallation(am *ints.GithubAppInstallation) (*ints.GithubAppInstallation, error)
	ReadGithubAppInstallationByInstallationID(gaID uint) (*ints.GithubAppInstallation, error)
	ReadGithubAppInstallationByAccountID(accountID int64) (*ints.GithubAppInstallation, error)
	ReadGithubAppInstallationByAccountIDs(accountIDs []int64) ([]*ints.GithubAppInstallation, error)
	DeleteGithubAppInstallationByAccountID(accountID int64) error
}
