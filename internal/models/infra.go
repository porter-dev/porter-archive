package models

import (
	"fmt"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// InfraStatus is the status that an infrastructure can take
type InfraStatus string

// The allowed statuses
const (
	StatusCreating InfraStatus = "creating"
	StatusCreated  InfraStatus = "created"
	StatusError    InfraStatus = "error"
)

// AWSInfraKind is the kind that aws infra can be
type AWSInfraKind string

// The supported AWS infra kinds
const (
	AWSInfraECR AWSInfraKind = "ecr"
	AWSInfraEKS AWSInfraKind = "eks"
)

// AWSInfra represents the metadata for an infrastructure type provisioned on
// AWS
type AWSInfra struct {
	gorm.Model

	// The type of infra that was provisioned
	Kind AWSInfraKind `json:"kind"`

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
	Kind AWSInfraKind `json:"kind"`

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

// GetID returns the unique id for this infra
func (ai *AWSInfra) GetID() string {
	return fmt.Sprintf("%s-%d-%d", ai.Kind, ai.ProjectID, ai.ID)
}

// ParseWorkspaceID returns the (kind, projectID, infraID)
func ParseWorkspaceID(workspaceID string) (string, uint, uint, error) {
	strArr := strings.Split(workspaceID, "-")

	if len(strArr) != 3 {
		return "", 0, 0, fmt.Errorf("workspace id improperly formatted")
	}

	projID, err := strconv.ParseUint(strArr[1], 10, 64)

	if err != nil {
		return "", 0, 0, err
	}

	infraID, err := strconv.ParseUint(strArr[2], 10, 64)

	if err != nil {
		return "", 0, 0, err
	}

	return strArr[0], uint(projID), uint(infraID), nil
}
