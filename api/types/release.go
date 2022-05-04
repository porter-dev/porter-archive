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
	ID              uint             `json:"id"`
	WebhookToken    string           `json:"webhook_token"`
	LatestVersion   string           `json:"latest_version"`
	GitActionConfig *GitActionConfig `json:"git_action_config,omitempty"`
	ImageRepoURI    string           `json:"image_repo_uri"`
	BuildConfig     *BuildConfig     `json:"build_config,omitempty"`
	Tags            []string         `json:"tags,omitempty"`
}

type GetReleaseResponse Release

type UpdateNotificationConfigRequest struct {
	Payload struct {
		Enabled bool `json:"enabled"`
		Success bool `json:"success"`
		Failure bool `json:"failure"`
	} `json:"payload"`
}

type CreateReleaseBaseRequest struct {
	RepoURL         string                 `schema:"repo_url"`
	TemplateName    string                 `json:"template_name" form:"required"`
	TemplateVersion string                 `json:"template_version" form:"required"`
	Values          map[string]interface{} `json:"values"`
	Name            string                 `json:"name" form:"required"`
}

type CreateReleaseRequest struct {
	*CreateReleaseBaseRequest

	ImageURL           string                        `json:"image_url" form:"required"`
	GithubActionConfig *CreateGitActionConfigRequest `json:"github_action_config,omitempty"`
	BuildConfig        *CreateBuildConfigRequest     `json:"build_config,omitempty"`
	Tags               []string                      `json:"tags,omitempty"`
}

type CreateAddonRequest struct {
	*CreateReleaseBaseRequest

	HelmRepoID uint `json:"helm_repo_id"`
}

type RollbackReleaseRequest struct {
	Revision int `json:"revision" form:"required"`
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
