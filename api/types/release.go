package types

import "helm.sh/helm/v3/pkg/release"

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
