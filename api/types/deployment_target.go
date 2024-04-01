package types

import (
	"time"

	"github.com/google/uuid"
)

// DeploymentTarget is a struct that represents a unique cluster, namespace pair that a Porter app is deployed to.
type DeploymentTarget struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uint      `json:"project_id"`
	ClusterID uint      `json:"cluster_id"`

	Name         string    `json:"name"`
	Namespace    string    `json:"namespace"`
	IsPreview    bool      `json:"is_preview"`
	IsDefault    bool      `json:"is_default"`
	CreatedAtUTC time.Time `json:"created_at"`
	UpdatedAtUTC time.Time `json:"updated_at"`
}

// CreateDeploymentTargetRequest is the request object for the /deployment-targets POST endpoint
type CreateDeploymentTargetRequest struct {
	// Deprecated: use name instead
	Selector string `json:"selector"`
	Name     string `json:"name,omitempty"`
	Preview  bool   `json:"preview"`
	// required if using the project-scoped endpoint
	ClusterId uint `json:"cluster_id"`
}

// CreateDeploymentTargetResponse is the response object for the /deployment-targets POST endpoint
type CreateDeploymentTargetResponse struct {
	DeploymentTargetID string `json:"deployment_target_id"`
}

// ListDeploymentTargetsRequest is the request object for the /deployment-targets GET endpoint
type ListDeploymentTargetsRequest struct {
	Preview bool `json:"preview"`
}

// ListDeploymentTargetsResponse is the response object for the /deployment-targets GET endpoint
type ListDeploymentTargetsResponse struct {
	DeploymentTargets []DeploymentTarget `json:"deployment_targets"`
}
