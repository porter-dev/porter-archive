package types

import (
	"helm.sh/helm/v3/pkg/release"
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
	GitActionConfig *GitActionConfig `json:"git_action_config,omitempty"`
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
}

type CreateAddonRequest struct {
	*CreateReleaseBaseRequest
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
