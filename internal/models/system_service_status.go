package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SystemServiceStatus represents an event that occurs on a Porter stack during a stacks lifecycle.
type SystemServiceStatus struct {
	gorm.Model

	// ID is a unique identifier for a given event
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// CreatedAt is the time (UTC) that a given event was created. This should not change
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time (UTC) that an event was last updated. This can occur when an event was created as PROGRESSING, then was marked as SUCCESSFUL for example
	UpdatedAt time.Time `json:"updated_at"`

	ProjectID uint `json:"project_id"`

	ClusterID uint `json:"cluster_id"`

	InvolvedObjectType string `json:"involved_object_type"`

	Name string `json:"name"`

	Namespace string `json:"namespace"`

	Metadata JSONB `json:"metadata" sql:"type:jsonb" gorm:"type:jsonb"`
}

// TableName overrides the table name
func (SystemServiceStatus) TableName() string {
	return "system_service_status"
}
