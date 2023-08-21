package types

import (
	"time"
)

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
	Buildpacks     string `json:"buildpacks,omitempty"`
	Dockerfile     string `json:"dockerfile,omitempty"`
	PullRequestURL string `json:"pull_request_url,omitempty"`

	// Porter YAML
	PorterYAMLBase64 string `json:"porter_yaml,omitempty"`
	PorterYamlPath   string `json:"porter_yaml_path,omitempty"`

	// Helm
	HelmRevisionNumber int `json:"helm_revision_number,omitempty"`
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
	EnvGroups        []string  `json:"env_groups"`
	// EnvironmentGroups are the list of environment groups that this app is linked to. This should be used instead of EnvGroups.
	EnvironmentGroups []string `json:"environment_groups"`
	UserUpdate        bool     `json:"user_update"`
	FullHelmValues    string   `json:"full_helm_values"`
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

type RunPorterAppCommandRequest struct {
	Command string `json:"command" form:"required"`
}

type RollbackPorterAppRequest struct {
	Revision int `json:"revision" form:"required"`
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
	PorterAppID uint           `json:"porter_app_id"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// PorterAppEventType is an alias for a string that represents a Porter Stack Event Type
type PorterAppEventType string

const (
	// PorterAppEventType_Build represents a Porter Stack Build event such as in Github or Gitlab
	PorterAppEventType_Build PorterAppEventType = "BUILD"
	// PorterAppEventType_Deploy represents a Porter Stack Deploy event which occurred through the Porter UI or CLI
	PorterAppEventType_Deploy PorterAppEventType = "DEPLOY"
	// PorterAppEventType_PreDeploy represents a Porter Stack Pre-deploy event which occurred through the Porter UI or CLI
	PorterAppEventType_PreDeploy PorterAppEventType = "PRE_DEPLOY"
	// PorterAppEventType_AppEvent represents a Porter Stack App Event which occurred whilst the application was running, such as an OutOfMemory (OOM) error
	PorterAppEventType_AppEvent PorterAppEventType = "APP_EVENT"
)

// PorterAppEventStatus is an alias for a string that represents a Porter Stack Event Status
type PorterAppEventStatus string

const (
	// PorterAppEventStatus_Success represents a Porter Stack Event that was successful
	PorterAppEventStatus_Success PorterAppEventStatus = "SUCCESS"
	// PorterAppEventStatus_Failed represents a Porter Stack Event that failed
	PorterAppEventStatus_Failed PorterAppEventStatus = "FAILED"
	// PorterAppEventStatus_Progressing represents a Porter Stack Event that is in progress
	PorterAppEventStatus_Progressing PorterAppEventStatus = "PROGRESSING"
	// PorterAppEventStatus_Canceled represents a Porter Stack Event that has been canceled
	PorterAppEventStatus_Canceled PorterAppEventStatus = "CANCELED"
)

// PorterAppEvent represents a simplified event for creating a Porter stack app event
// swagger:model
type CreateOrUpdatePorterAppEventRequest struct {
	// ID, if supplied, will be assumed to be an update event
	ID string `json:"id"`
	// Status contains the accepted status' of a given event such as SUCCESS, FAILED, PROGRESSING, etc.
	Status PorterAppEventStatus `json:"status,omitempty"`
	// Type represents a supported Porter Stack Event
	Type PorterAppEventType `json:"type"`
	// TypeExternalSource represents an external event source such as Github, or Gitlab. This is not always required but will commonly be see in build events
	TypeExternalSource string         `json:"type_source,omitempty"`
	Metadata           map[string]any `json:"metadata,omitempty"`
}

// ServiceDeploymentMetadata contains information about a service when it deploys
type ServiceDeploymentMetadata struct {
	// Status is the status of the service deployment
	Status PorterAppEventStatus `json:"status"`
	// ExternalURI is the external URI of a service (if it is web)
	ExternalURI string `json:"external_uri"`
	// Type is the type of the service - one of web, worker, or job
	Type string `json:"type"`
}
type ListEnvironmentGroupsResponse struct {
	// EnvironmentGroups is a list of environment groups
	EnvironmentGroups []EnvironmentGroupListItem `json:"environment_groups,omitempty"`
}

type EnvironmentGroupListItem struct {
	// Name is the name of the environment group
	Name string `json:"name"`
	// LatestVersion is the latest version of the environment group
	LatestVersion int `json:"latest_version"`
	// Variables is a map of variables for the environment group
	Variables map[string]string `json:"variables"`
	// SecretVariables is a map of secret variables for the environment group
	SecretVariables map[string]string `json:"secret_variables"`
	// CreatedAtUTC is the time the environment group was created
	CreatedAtUTC time.Time `json:"created_at"`
	// LinkedApplications is the list of applications this env group is linked to
	LinkedApplications []string `json:"linked_applications,omitempty"`
}
