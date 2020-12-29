package models

import (
	"fmt"

	"gorm.io/gorm"
)

// InfraStatus is the status that an infrastructure can take
type InfraStatus string

// The allowed statuses
const (
	StatusCreating InfraStatus = "creating"
	StatusCreated  InfraStatus = "created"
	StatusUpdating InfraStatus = "updating"
)

// AWSInfra represents the metadata for an infrastructure type provisioned on
// AWS
type AWSInfra struct {
	gorm.Model

	// The type of infra that was provisioned
	Kind string `json:"kind"`

	// The project that this infra belongs to
	ProjectID uint `json:"project_id"`

	// Status is the status of the infra
	Status InfraStatus `json:"status"`

	// The AWS integration that was used to create the infra
	AWSIntegrationID uint
}

// AWSInfraExternal is an external AWSInfra to be shared over REST
type AWSInfraExternal struct {
	ID uint `json:"id"`

	// The project that this integration belongs to
	ProjectID uint `json:"project_id"`

	// The type of infra that was provisioned
	Kind string `json:"kind"`

	// Status is the status of the infra
	Status InfraStatus `json:"status"`
}

// Externalize generates an external AWSInfra to be shared over REST
func (ai *AWSInfra) Externalize() *AWSInfraExternal {
	return &AWSInfraExternal{
		ID:        ai.ID,
		ProjectID: ai.ProjectID,
		Kind:      ai.Kind,
		Status:    ai.Status,
	}
}

// GetWorkspaceID returns the unique workspace id for this infra
func (ai *AWSInfra) GetWorkspaceID() string {
	return fmt.Sprintf("%s-%d-%d", ai.Kind, ai.ProjectID, ai.ID)
}
