package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DeploymentTarget struct {
	gorm.Model

	// ID is a UUID for the Revision
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// ClusterID is the ID of the cluster that is being targeted.
	ClusterID int `json:"cluster_id"`

	// ProjectID is the ID of the project that the target belongs to.
	ProjectID int `json:"project_id"`

	// Selector is the identifier to target.
	Selector string `json:"selector"`

	// SelectorType is the kind of selector (i.e. NAMESPACE or LABEL).
	SelectorType string `json:"selector_type"`
}
