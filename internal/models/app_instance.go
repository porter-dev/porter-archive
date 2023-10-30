package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppInstance extends gorm.Model to represent an instance of an app (source information + deployment target)
type AppInstance struct {
	gorm.Model

	// ID is a unique identifier for a given app instance
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	// Name is the name of the app instance. This is unique across a given deployment target
	Name string `json:"name"`
	// ProjectID is the ID of the project that the app instance belongs to
	ProjectID uint `json:"project_id"`
	// CreatedAt is the time (UTC) that a given app instance was created. This should not change
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time (UTC) that an app instance was last updated.
	UpdatedAt time.Time `json:"updated_at"`
	// PorterAppID is the ID of the app (source information) that the given app instance relates to
	PorterAppID uint `json:"porter_app_id"`
	// DeploymentTargetID is the ID of the deployment target that the event relates to
	DeploymentTargetID uuid.UUID `json:"deployment_target_id" gorm:"type:uuid"`
}
