package types

type PorterApp struct {
	ID        uint `json:"id"`
	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	Name string `json:"name"`

	ImageRepoURI string `json:"image_repo_uri,omitempty"`

	// Git repo information (optional)
	GitRepoID uint   `json:"git_repo_id,omitempty"`
	RepoName  string `json:"repo_name,omitempty"`
	GitBranch string `json:"git_branch,omitempty"`

	// Build settings (optional)
	BuildContext string `json:"build_context,omitempty"`
	Builder      string `json:"builder,omitempty"`
	Buildpacks   string `json:"build_packs,omitempty"`
	Dockerfile   string `json:"dockerfile,omitempty"`
}
