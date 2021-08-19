package models

import (
	"gorm.io/gorm"
)

// Release model used to retrieve webhook tokens for a chart.

// Release type that extends gorm.Model
type Release struct {
	gorm.Model

	WebhookToken string `json:"webhook_token" gorm:"unique"`
	ClusterID    uint   `json:"cluster_id"`
	ProjectID    uint   `json:"project_id"`
	Name         string `json:"name"`
	Namespace    string `json:"namespace"`

	// The complete image repository uri to pull from. This is also stored in GitActionConfig,
	// but this should be used for the source of truth going forward.
	ImageRepoURI string `json:"image_repo_uri,omitempty"`

	GitActionConfig    GitActionConfig `json:"git_action_config"`
	NotificationConfig uint
}

// ReleaseExternal represents the Release type that is sent over REST
type ReleaseExternal struct {
	ID uint `json:"id"`

	WebhookToken    string                   `json:"webhook_token"`
	GitActionConfig *GitActionConfigExternal `json:"git_action_config,omitempty"`
}

// Externalize generates an external User to be shared over REST
func (r *Release) Externalize() *ReleaseExternal {
	return &ReleaseExternal{
		ID:              r.ID,
		WebhookToken:    r.WebhookToken,
		GitActionConfig: r.GitActionConfig.Externalize(),
	}
}
