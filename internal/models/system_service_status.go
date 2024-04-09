package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SystemServiceStatus represents a status entry in a database for a single service in a specific cluster
type SystemServiceStatus struct {
	gorm.Model

	// ID is a unique identifier for a given event
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// CreatedAt is the time (UTC) that a given status was created. This should not change.
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time (UTC) that the status was last updated.
	UpdatedAt time.Time `json:"updated_at"`

	ProjectID uint `json:"project_id"`

	ClusterID uint `json:"cluster_id"`

	// InvolvedObjectType is the type of k8s object that the service runs
	// this is currently expected to be "Deployment", "StatefulSet" or "DaemonSet"
	InvolvedObjectType string `json:"involved_object_type"`

	Name string `json:"name"`

	Namespace string `json:"namespace"`

	// Any other relevant metadata. This field allows us to be flexible in the future.
	Metadata JSONB `json:"metadata" sql:"type:jsonb" gorm:"type:jsonb"`
}

// TableName overrides the table name
func (SystemServiceStatus) TableName() string {
	return "system_service_status"
}
