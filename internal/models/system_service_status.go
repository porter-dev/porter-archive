package models

import (
	"database/sql"
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

	// StartTime is the time at which the status was first observed
	StartTime sql.NullTime `db:"start_time"`

	// EndTime is the time at which the status was last observed
	// If null, this means the status might not have been resolved yet
	EndTime sql.NullTime `db:"end_time"`

	// ProjectID is the ID of the project that this app belongs to
	ProjectID uint `db:"project_id"`

	// ClusterID is the ID of the cluster that this app belongs to
	ClusterID uint `db:"cluster_id"`

	// the type of kubernetes object this service is
	InvolvedObjectType string `db:"involved_object_type"`

	Name string `db:"name"`

	Namespace string `db:"namespace"`

	Severity string `db:"severity"`

	// Any other relevant metadata. This field allows us to be flexible in the future.
	Metadata JSONB `json:"metadata" sql:"type:jsonb" gorm:"type:jsonb"`
}

// TableName overrides the table name
func (SystemServiceStatus) TableName() string {
	return "system_service_status_v2"
}
