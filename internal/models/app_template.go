package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AppTemplate represents a partial spec of a porter app that hydrates the first revision of an app
type AppTemplate struct {
	gorm.Model

	// ID is a UUID for the AppRevision
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// Base64App is the PorterApp as json encoded in base64
	Base64App string `json:"base64_app"`

	// ProjectID is the ID of the project that the template belongs to.
	ProjectID int `json:"project_id"`

	// PorterAppID is the ID of the PorterApp that the template belongs to.
	PorterAppID int `json:"porter_app_id"`
}
