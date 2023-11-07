package models

import (
	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
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

	// VanityName is a human-readable name for the deployment target.  It will be unique within a project once all existing deployment targets have been backfilled (tracking: POR-1991)
	VanityName string `json:"vanity_name" gorm:"default:''"`

	// Selector is the identifier to target.
	Selector string `json:"selector"`

	// SelectorType is the kind of selector (i.e. NAMESPACE or LABEL).
	SelectorType DeploymentTargetSelectorType `json:"selector_type"`

	// Preview is a boolean indicating whether this target is a preview target.
	Preview bool `gorm:"default:false" json:"preview"`

	// Metadata is a JSONB column that stores arbitrary metadata about the deployment target
	Metadata JSONB `json:"metadata" sql:"type:jsonb" gorm:"type:jsonb;default:'{}'"`

	// IsDefault indicates whether this is the default deployment target for the cluster
	IsDefault bool `gorm:"default:false" json:"is_default"`
}

// ToDeploymentTargetType generates an external types.PorterApp to be shared over REST
func (d *DeploymentTarget) ToDeploymentTargetType() *types.DeploymentTarget {
	return &types.DeploymentTarget{
		ID:           d.ID,
		ProjectID:    uint(d.ProjectID),
		ClusterID:    uint(d.ClusterID),
		Selector:     d.Selector,
		SelectorType: string(d.SelectorType),
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}
