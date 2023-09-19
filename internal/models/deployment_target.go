package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DeploymentTargetSelectorType is the type of selector for a deployment target
type DeploymentTargetSelectorType string

const (
	// DeploymentTargetSelectorType_Namespace indicates that the selector is a namespace
	DeploymentTargetSelectorType_Namespace DeploymentTargetSelectorType = "NAMESPACE"
)

// DeploymentTarget represents a deployment target on a given cluster
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
	SelectorType DeploymentTargetSelectorType `json:"selector_type"`
}
