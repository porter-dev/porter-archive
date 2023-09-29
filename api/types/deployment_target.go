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

	Selector     string    `json:"selector"`
	SelectorType string    `json:"selector_type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
