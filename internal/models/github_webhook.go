package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GithhubWebhook struct {
	gorm.Model

	// ID is a UUID for the Revision
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// ClusterID is the ID of the cluster that the webhook is associated with.
	ClusterID int

	// ProjectID is the ID of the project that the webhook is associated with.
	ProjectID int

	// PorterAppID is the ID of the PorterApp that the webhook is associated with.
	PorterAppID int

	// GithubWebhookID is the ID of the webhook provided by Github.
	GithubWebhookID int64
}
