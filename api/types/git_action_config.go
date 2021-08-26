package types

// GitActionConfig
type GitActionConfig struct {
	// The git repo in ${owner}/${repo} form
	GitRepo string `json:"git_repo"`

	// The git branch to use
	GitBranch string `json:"git_branch"`

	// The complete image repository uri to pull from
	ImageRepoURI string `json:"image_repo_uri"`

	// The git integration id
	GitRepoID uint `json:"git_repo_id"`

	// The path to the dockerfile in the git repo
	DockerfilePath string `json:"dockerfile_path" form:"required"`

	// The build context
	FolderPath string `json:"folder_path"`
}
