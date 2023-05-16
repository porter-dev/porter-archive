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
	BuildContext   string `json:"build_context,omitempty"`
	Builder        string `json:"builder,omitempty"`
	Buildpacks     string `json:"build_packs,omitempty"`
	Dockerfile     string `json:"dockerfile,omitempty"`
	PullRequestURL string `json:"pull_request_url,omitempty"`

	// Porter YAML
	PorterYAMLBase64 string `json:"porter_yaml,omitempty"`
	PorterYamlPath   string `json:"porter_yaml_path,omitempty"`
}

// swagger:model
type CreatePorterAppRequest struct {
	ClusterID        uint      `json:"cluster_id"`
	ProjectID        uint      `json:"project_id"`
	RepoName         string    `json:"repo_name"`
	GitBranch        string    `json:"git_branch"`
	GitRepoID        uint      `json:"git_repo_id"`
	BuildContext     string    `json:"build_context"`
	Builder          string    `json:"builder"`
	Buildpacks       string    `json:"buildpacks"`
	Dockerfile       string    `json:"dockerfile"`
	ImageRepoURI     string    `json:"image_repo_uri"`
	PullRequestURL   string    `json:"pull_request_url"`
	PorterYAMLBase64 string    `json:"porter_yaml"`
	PorterYamlPath   string    `json:"porter_yaml_path"`
	ImageInfo        ImageInfo `json:"image_info" form:"omitempty"`
	OverrideRelease  bool      `json:"override_release"`
}

type UpdatePorterAppRequest struct {
	RepoName       string `json:"repo_name"`
	GitBranch      string `json:"git_branch"`
	BuildContext   string `json:"build_context"`
	Builder        string `json:"builder"`
	Buildpacks     string `json:"buildpacks"`
	Dockerfile     string `json:"dockerfile"`
	ImageRepoURI   string `json:"image_repo_uri"`
	PullRequestURL string `json:"pull_request_url"`
}

type ListPorterAppResponse []*PorterApp
