package models

import (
	"github.com/porter-dev/porter/api/types"
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

// GitActionConfig is a configuration for release's CI integration via
// Github Actions
type GitActionConfig struct {
	gorm.Model

	// The ID of the release that this is linked to
	ReleaseID uint `json:"release_id"`

	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The git branch to use
	GitBranch string `json:"git_branch"`

	// The complete image repository uri to pull from
	ImageRepoURI string `json:"image_repo_uri"`

	// The git installation ID
	GithubInstallationID uint `json:"git_installation_id"`

	// The git repo ID (legacy field)
	GitRepoID uint `json:"git_repo_id"`

	// The gitlab integration ID
	GitlabIntegrationID uint `json:"gitlab_integration_id"`

	// The path to the dockerfile in the git repo
	DockerfilePath string `json:"dockerfile_path"`

	// The build context
	FolderPath string `json:"folder_path"`

	// Determines on how authentication is performed on this action
	IsInstallation bool `json:"is_installation"`

	Version string `json:"version" gorm:"default:v0.0.1"`
}

// ToGitActionConfigType generates an external GitActionConfig to be shared over REST
func (r *GitActionConfig) ToGitActionConfigType() *types.GitActionConfig {
	return &types.GitActionConfig{
		GitRepo:             r.GitRepo,
		GitBranch:           r.GitBranch,
		ImageRepoURI:        r.ImageRepoURI,
		GitRepoID:           r.GitRepoID,
		GitlabIntegrationID: r.GitlabIntegrationID,
		DockerfilePath:      r.DockerfilePath,
		FolderPath:          r.FolderPath,
	}
}
