package models

import (
	"database/sql/driver"
	"encoding/json"

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
	// Further details to expand upon this condition are available in ConditionMetadata
	Condition string `json:"condition"`

	// ConditionMetadata contains all information about the condition of a given revision.
	// If condition is "SUCCESS", this will likely be empty.
	// This will follow the error response contract, with the following keys:
	// {
	// 	"errors": [
	// 		{
	// 			"code": "string",
	// 			"message": "string",
	// 			"metadata": {}
	// 		}
	// 	]
	// }
	ConditionMetadata JSONB `json:"condition_metadata" sql:"type:jsonb" gorm:"type:jsonb"`
}

// TableName overrides the table name
func (APIContractRevision) TableName() string {
	return "api_contract_revisions"
}

// JSONB implements the jsonb type in postgres for gorm
type JSONB map[string]any

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	valueString, err := json.Marshal(j)
	return string(valueString), err
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if err := json.Unmarshal(value.([]byte), &j); err != nil {
		return err
	}
	return nil
}
