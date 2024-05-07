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

	// Name is the name of the template, most commonly matches the app name and is unique within the project
	Name string `json:"name" gorm:"default:''"`

	// Base64App is the PorterApp as json encoded in base64
	Base64App string `json:"base64_app"`

	// ProjectID is the ID of the project that the template belongs to.
	ProjectID int `json:"project_id"`

	// PorterAppID is the ID of the PorterApp that the template belongs to.
	PorterAppID int `json:"porter_app_id"`

	// BaseDeploymentTargetID is the ID of the deployment target that this template is based on
	// This is used to look up the latest app revision in the base, which will hydrate the template on apply.
	BaseDeploymentTargetID uuid.UUID `json:"base_deployment_target_id" gorm:"type:uuid;default:00000000-0000-0000-0000-000000000000"`

	// Base64AddonTemplates is an encoded object containing templated addons to deploy alongside the app
	Base64AddonTemplates string `json:"base64_addon_templates"`
}
