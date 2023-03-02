package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AWSAssumeRoleChain represents an assume role chain link
type AWSAssumeRoleChain struct {
	gorm.Model

	// ID is a UUID for the CAPI Cluster's config
	ID uuid.UUID `gorm:"type:uuid;primaryKey"`

	// SourceARN is ARN which will assume the target ARN
	SourceARN string `json:"source_arn"`

	// TargetARN is ARN which will assume the target ARN
	TargetARN string `json:"target_arn"`

	// ExternalID is ID which is required when assuming a role
	ExternalID string `json:"external_id"`

	// ProjectID is the ID of the project that the config belongs to.
	// This should be a foreign key, but GORM doesnt play well with FKs.
	ProjectID int
}

// TableName overrides the table name
func (AWSAssumeRoleChain) TableName() string {
	return "aws_assume_role_chains"
}
