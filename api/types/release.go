package types

import "helm.sh/helm/v3/pkg/release"

// Release is a helm release with a form attached
type Release struct {
	*release.Release

	ID              uint             `json:"id"`
	WebhookToken    string           `json:"webhook_token"`
	GitActionConfig *GitActionConfig `json:"git_action_config,omitempty"`
	Form            *FormYAML        `json:"form,omitempty"`
}

type GetReleaseResponse Release
