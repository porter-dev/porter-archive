package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// APIContractRevision represents a revision of an API contract
type APIContractRevision struct {
	gorm.Model

	// ID is a UUID for the APIContract
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// Base64Contract is the APIContract as json encoded in base64
	Base64Contract string `json:"base64_contract"`

	// ClusterID is the ID of the cluster that the config created.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ClusterID int `json:"cluster_id"`

	// ProjectID is the ID of the project that the config belongs to.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ProjectID int `json:"project_id"`

	// Condition is the status of the apply that happened for this revision.
	// Condition will contain any failure reasons for a revision, or "SUCCESS" if the revision was applied successfully.
	Condition string `json:"condition"`
}

// TableName overrides the table name
func (APIContractRevision) TableName() string {
	return "api_contract_revisions"
}
