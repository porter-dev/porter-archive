package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CAPIConfig represents a ClusterAPI base64 encoded config
type CAPIConfig struct {
	gorm.Model

	// ID is a UUID for the CAPI Cluster's config
	ID uuid.UUID `gorm:"type:uuid;primaryKey"`

	// Base64Config is the CAPI config for a cluster, encoded in base64
	Base64Config string

	// ClusterID is the ID of the cluster that the config created.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ClusterID int

	// ProjectID is the ID of the project that the config belongs to.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ProjectID int
}

// TableName overrides the table name
func (CAPIConfig) TableName() string {
	return "capi_configs"
}
