package types

import (
	"helm.sh/helm/v3/pkg/release"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// Release is a helm release with a form attached
type Release struct {
	*release.Release
	*PorterRelease

	Form *FormYAML `json:"form,omitempty"`
}

type PorterRelease struct {
	// The ID of this Porter release
	ID uint `json:"id"`

	// The webhook token used to secure Github repository webhooks
	WebhookToken string `json:"webhook_token"`

	// The latest version of this Porter release
	LatestVersion string `json:"latest_version"`

	// Configuration regarding the connected git repository
	GitActionConfig *GitActionConfig `json:"git_action_config,omitempty"`

	// The complete image repository URI for this release
	ImageRepoURI string `json:"image_repo_uri"`

	// The build configuration for this release when using buildpacks
	BuildConfig *BuildConfig `json:"build_config,omitempty"`

	// The list of tags for this release
	Tags []string `json:"tags,omitempty"`

	// Whether this release is tied to a stack or not
	IsStack bool `json:"is_stack"`
}

// swagger:model
type GetReleaseResponse Release

type UpdateNotificationConfigRequest struct {
	Payload struct {
		Enabled bool `json:"enabled"`
		Success bool `json:"success"`
		Failure bool `json:"failure"`
	} `json:"payload"`
}

type CreateReleaseBaseRequest struct {
	// The repository URL for this release
	RepoURL string `json:"repo_url,omitempty" schema:"repo_url"`

	// the Porter charts templated name
	// required: true
	TemplateName string `json:"template_name" form:"required"`

	// The Porter charts template version
	// required: true
	TemplateVersion string `json:"template_version" form:"required"`

	// The Helm values for this release
	Values map[string]interface{} `json:"values"`

	// The name of this release
	// required: true
	Name string `json:"name" form:"required"`
}

// swagger:model
type CreateReleaseRequest struct {
	*CreateReleaseBaseRequest

	// The repository image URL for this release
	// required: true
	ImageURL string `json:"image_url" form:"required"`

	// Configuration regarding the connected git repository
	GitActionConfig *CreateGitActionConfigRequest `json:"git_action_config,omitempty"`

	// Build configuration options for this release
	BuildConfig *CreateBuildConfigRequest `json:"build_config,omitempty"`

	// The list of tags for this release
	Tags []string `json:"tags,omitempty"`

	// The list of synced environment groups for this release
	SyncedEnvGroups []string `json:"synced_env_groups,omitempty"`
}

type CreateAddonRequest struct {
	*CreateReleaseBaseRequest

	HelmRepoID uint `json:"helm_repo_id"`
}

type RollbackReleaseRequest struct {
	Revision int `json:"revision" form:"required"`
}

// swagger:model UpdateReleaseRequest
type V1UpgradeReleaseRequest struct {
	// The Helm values to upgrade the release with
	// required: true
	Values map[string]interface{} `json:"values" form:"required"`

	// The Porter charts version to upgrade the release with
	ChartVersion string `json:"version"`
}

type UpgradeReleaseRequest struct {
	Values       string `json:"values" form:"required"`
	ChartVersion string `json:"version"`
}

type UpdateImageBatchRequest struct {
	ImageRepoURI string `json:"image_repo_uri" form:"required"`
	Tag          string `json:"tag" form:"required"`
}

type GetJobsStatusResponse struct {
	Status    string       `json:"status,omitempty"`
	StartTime *metav1.Time `json:"start_time,omitempty"`
}

const URLParamToken URLParam = "token"

type WebhookRequest struct {
	Commit string `schema:"commit"`

	// NOTICE: deprecated. This field should no longer be used; it is not supported
	// internally.
	Repository string `schema:"repository"`
}

type GetGHATemplateRequest struct {
	ReleaseName        string                        `json:"release_name"`
	GithubActionConfig *CreateGitActionConfigRequest `json:"github_action_config" form:"required"`
}

type GetGHATemplateResponse string

type GetReleaseStepsResponse []SubEvent

type SubEvent struct {
	EventID string      `json:"event_id"`
	Name    string      `json:"name"`
	Index   int64       `json:"index"`
	Status  EventStatus `json:"status"`
	Info    string      `json:"info"`
	Time    int64       `json:"time"`
}

type EventStatus int64

const (
	EventStatusSuccess    EventStatus = 1
	EventStatusInProgress             = 2
	EventStatusFailed                 = 3
)

type UpdateReleaseStepsRequest struct {
	Event SubEvent `json:"event" form:"required"`
}

type NotificationConfig struct {
	Enabled bool `json:"enabled"`
	Success bool `json:"success"`
	Failure bool `json:"failure"`

	NotifLimit string `json:"notif_limit"`
}

type GetNotificationConfigResponse struct {
	*NotificationConfig
}

type DNSRecord struct {
	ExternalURL string `json:"external_url"`

	Endpoint string `json:"endpoint"`
	Hostname string `json:"hostname"`

	ClusterID uint `json:"cluster_id"`
}

type GetReleaseAllPodsResponse []v1.Pod

type PatchUpdateReleaseTags struct {
	Tags []string `json:"tags"`
}

type PartialGitActionConfig struct {
	// The branch to use for the git repository
	// required: true
	GitBranch string `json:"branch" form:"required"`
}

type UpdateGitActionConfigRequest struct {
	GitActionConfig *PartialGitActionConfig `json:"git_action_config"`
}
