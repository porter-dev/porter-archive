package models

import (
	"github.com/porter-dev/porter/internal/models/integrations"
	"gorm.io/gorm"
)

// GitRepo is an integration that can connect to a remote git repo via an auth
// mechanism (currently only oauth)
type GitRepo struct {
	gorm.Model

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The username/organization that this repo integration is linked to
	RepoEntity string `json:"repo_entity"`

	// The various auth mechanisms available to the integration
	OAuthIntegrationID uint
}

// GitRepoExternal is a repository to be shared over REST
type GitRepoExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The username/organization that this repo integration is linked to
	RepoEntity string `json:"repo_entity"`

	// The integration service for this git repo
	Service integrations.IntegrationService `json:"service"`
}

// Externalize generates an external Repo to be shared over REST
func (r *GitRepo) Externalize() *GitRepoExternal {
	return &GitRepoExternal{
		ID:         r.Model.ID,
		ProjectID:  r.ProjectID,
		RepoEntity: r.RepoEntity,
		Service:    integrations.Github,
	}
}

// GitActionConfig is a configuration for release's CI integration via
// Github Actions
type GitActionConfig struct {
	gorm.Model

	// The ID of the release that this is linked to
	ReleaseID uint `json:"release_id"`

	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The complete image repository uri to pull from
	ImageRepoURI string `json:"image_repo_uri"`

	// The git integration id
	GitRepoID uint `json:"git_repo_id"`

	// The path to the dockerfile in the git repo
	DockerfilePath string `json:"dockerfile_path"`

	// The build context
	FolderPath string `json:"folder_path"`
}

// GitActionConfigExternal is an external GitActionConfig to be shared over REST
type GitActionConfigExternal struct {
	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The complete image repository uri to pull from
	ImageRepoURI string `json:"image_repo_uri"`

	// The git integration id
	GitRepoID uint `json:"git_repo_id"`

	// The path to the dockerfile in the git repo
	DockerfilePath string `json:"dockerfile_path" form:"required"`

	// The build context
	FolderPath string `json:"folder_path"`
}

// Externalize generates an external GitActionConfig to be shared over REST
func (r *GitActionConfig) Externalize() *GitActionConfigExternal {
	return &GitActionConfigExternal{
		GitRepo:        r.GitRepo,
		ImageRepoURI:   r.ImageRepoURI,
		GitRepoID:      r.GitRepoID,
		DockerfilePath: r.DockerfilePath,
		FolderPath:     r.FolderPath,
	}
}
