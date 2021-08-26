package models

import (
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

// HelmRepo is an integration that can connect to a Helm repository via a
// set of auth mechanisms
type HelmRepo struct {
	gorm.Model

	// Name given to the Helm repository
	Name string `json:"name"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// RepoURL is the URL to the helm repo. This varies based on the integration
	// type. For example, for AWS S3 this may be prefixed with s3://, or for
	// GCS it may be gs://
	RepoURL string `json:"repo_url"`

	// ------------------------------------------------------------------
	// All fields below this line are encrypted before storage
	// ------------------------------------------------------------------
	BasicAuthIntegrationID uint
	GCPIntegrationID       uint
	AWSIntegrationID       uint

	// A token cache that can be used by an auth mechanism (integration), if desired
	TokenCache integrations.HelmRepoTokenCache
}

// HelmRepoExternal is an external HelmRepo to be shared over REST
type HelmRepoExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// Name of the repo
	Name string `json:"name"`

	RepoURL string `json:"repo_name"`

	// The integration service for this registry
	Service integrations.IntegrationService `json:"service"`
}

// Externalize generates an external Registry to be shared over REST
func (hr *HelmRepo) Externalize() *HelmRepoExternal {
	var serv integrations.IntegrationService

	if hr.BasicAuthIntegrationID != 0 {
		serv = integrations.HelmRepo
	} else if hr.AWSIntegrationID != 0 {
		serv = integrations.S3
	} else if hr.GCPIntegrationID != 0 {
		serv = integrations.GCS
	}

	return &HelmRepoExternal{
		ID:        hr.ID,
		ProjectID: hr.ProjectID,
		Name:      hr.Name,
		RepoURL:   hr.RepoURL,
		Service:   serv,
	}
}

// ToHelmRepoType generates an external HelmRepo to be shared over REST
func (hr *HelmRepo) ToHelmRepoType() *types.HelmRepo {
	return &types.HelmRepo{
		ID:        hr.ID,
		ProjectID: hr.ProjectID,
		Name:      hr.Name,
		RepoURL:   hr.RepoURL,
	}
}
