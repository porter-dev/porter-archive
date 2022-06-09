package types

// GitActionConfig
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

type CreateGitActionConfigRequest struct {
	GitRepo             string `json:"git_repo" form:"required"`
	GitBranch           string `json:"git_branch"`
	ImageRepoURI        string `json:"image_repo_uri" form:"required"`
	DockerfilePath      string `json:"dockerfile_path"`
	FolderPath          string `json:"folder_path"`
	GitRepoID           uint   `json:"git_repo_id"`
	GitlabIntegrationID uint   `json:"gitlab_integration_id"`
	RegistryID          uint   `json:"registry_id"`

	ShouldCreateWorkflow bool `json:"should_create_workflow"`
}
