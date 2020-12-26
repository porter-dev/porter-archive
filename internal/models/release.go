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
}

// ReleaseExternal represents the Release type that is sent over REST
type ReleaseExternal struct {
	ID uint `json:"id"`

	WebhookToken string `json:"webhook_token"`
}

// Externalize generates an external User to be shared over REST
func (r *Release) Externalize() *ReleaseExternal {
	return &ReleaseExternal{
		ID:           r.ID,
		WebhookToken: r.WebhookToken,
	}
}
