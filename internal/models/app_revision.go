package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AppRevision struct {
	gorm.Model

	// ID is a UUID for the AppRevision
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// Base64Application is the PorterApp as json encoded in base64
	Base64Application string `json:"base64_application"`

	// Status is the status of the apply that happened for this revision.
	Status string `json:"status"`

	// DeploymentTargetID is the ID of the deployment target that the revision applies to.
	DeploymentTargetID uuid.UUID `json:"deployment_target_id"`

	// ProjectID is the ID of the project that the revision belongs to.
	ProjectID int `json:"project_id"`

	// PorterAppID is the ID of the PorterApp that the revision belongs to.
	PorterAppID int `json:"porter_app_id"`
}
