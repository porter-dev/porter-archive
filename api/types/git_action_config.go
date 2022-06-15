package types

// The git configuration for this release (when deployed from a git repository)
type GitActionConfig struct {
	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The git branch to use
	GitBranch string `json:"git_branch"`

	// The complete image repository uri to pull from
	ImageRepoURI string `json:"image_repo_uri"`

	// The github integration ID
	GitRepoID uint `json:"git_repo_id"`

	// The gitlab integration ID
	GitlabIntegrationID uint `json:"gitlab_integration_id"`

	// The path to the dockerfile in the git repo
	DockerfilePath string `json:"dockerfile_path"`

	// The build context
	FolderPath string `json:"folder_path"`
}

// The git configuration for this new release (when deploying from a git repository)
type CreateGitActionConfigRequest struct {
	// The git repo in ${owner}/${repo} form
	// required: true
	GitRepo string `json:"git_repo" form:"required"`

	// The branch name of the git repository
	GitBranch string `json:"git_branch"`

	// The complete image repository URI to pull from
	// required: true
	ImageRepoURI string `json:"image_repo_uri" form:"required"`

	// The path to the Dockerfile in the git repository
	DockerfilePath string `json:"dockerfile_path"`

	// The path to use as the base directory in the git repository
	FolderPath string `json:"folder_path"`

	// The Github installation ID with access to the repository
	GitRepoID uint `json:"git_repo_id"`

	// The Gitlab integration ID with access to the repository
	GitlabIntegrationID uint `json:"gitlab_integration_id"`

	// The Porter registry ID to link against
	RegistryID uint `json:"registry_id"`

	// Denotes if the Github workflow files need to be created
	ShouldCreateWorkflow bool `json:"should_create_workflow"`
}
