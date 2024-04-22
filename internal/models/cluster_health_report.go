package models

import (
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx/types"
	"gorm.io/gorm"
)

// ClusterHealthReport represents a cluster health record in the database
type ClusterHealthReport struct {
	gorm.Model

	ID        uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt sql.NullTime `json:"created_at"`
	UpdatedAt sql.NullTime `json:"updated_at"`

	// ProjectID is the ID of the project that this cluster belongs to
	ProjectID uint `json:"project_id"`

	// ClusterID is the ID of the cluster that this health record belongs to
	ClusterID uint `json:"cluster_id"`

	// Type is the type of health check
	Type string `json:"type"`

	// Metadata is the metadata associated with the health check
	Metadata types.JSONText `json:"metadata"`
}

func (ClusterHealthReport) TableName() string {
	return "cluster_health_report"
}
