package types

import "time"

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

// PorterAppEvent represents an event that occurs on a Porter stack during a stacks lifecycle.
type PorterAppEvent struct {
	ID string `json:"id"`
	// Status contains the accepted status' of a given event such as SUCCESS, FAILED, PROGRESSING, etc.
	Status string `json:"status,omitempty"`
	// Type represents a supported Porter Stack Event
	Type PorterAppEventType `json:"type"`
	// TypeExternalSource represents an external event source such as Github, or Gitlab. This is not always required but will commonly be see in build events
	TypeExternalSource string `json:"type_source,omitempty"`
	// CreatedAt is the time (UTC) that a given event was created. This should not change
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time (UTC) that an event was last updated. This can occur when an event was created as PROGRESSING, then was marked as SUCCESSFUL for example
	UpdatedAt time.Time `json:"updated_at"`
	// PorterAppID is the ID that the given event relates to
	PorterAppID string         `json:"porter_app_id"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// PorterAppEventType is an alias for a string that represents a Porter Stack Event Type
type PorterAppEventType string

const (
	// PorterAppEventType_Build represents a Porter Stack Build event such as in Github or Gitlab
	PorterAppEventType_Build PorterAppEventType = "BUILD"
	// PorterAppEventType_Deploy represents a Porter Stack Deploy event which occurred through the Porter UI or CLI
	PorterAppEventType_Deploy PorterAppEventType = "DEPLOY"
	// PorterAppEventType_AppEvent represents a Porter Stack App Event which occurred whilst the application was running, such as an OutOfMemory (OOM) error
	PorterAppEventType_AppEvent PorterAppEventType = "APP_EVENT"
)
