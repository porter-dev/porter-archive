package models

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// ProjectUsage keeps track of the usage limits for a project
type ProjectUsage struct {
	gorm.Model

	// The project ID that this model refers to
	ProjectID uint

	// The CPU usage, in vCPUs
	ResourceCPU uint

	// The memory usage, in bytes
	ResourceMemory uint

	// The number of clusters
	Clusters uint

	// The number of users
	Users uint
}

// ToProjectUsageType converts the project usage model to a project usage API type
func (p *ProjectUsage) ToProjectUsageType() *types.ProjectUsage {
	return &types.ProjectUsage{
		ResourceCPU:    p.ResourceCPU,
		ResourceMemory: p.ResourceMemory,
		Clusters:       p.Clusters,
		Users:          p.Users,
	}
}

// ProjectUsageCache stores the latest cache of the resource usage for a project,
// for fields that are expensive to compute
type ProjectUsageCache struct {
	gorm.Model

	// The project ID that this model refers to
	ProjectID uint

	// The CPU usage, in vCPUs
	ResourceCPU uint

	// The memory usage, in bytes
	ResourceMemory uint

	// Whether the user is exceeding usage
	Exceeded bool

	// How long the user has been exceeding resource limits
	ExceededSince *time.Time
}

func (p *ProjectUsageCache) Is24HrOld() bool {
	timeSince := time.Now().Sub(p.UpdatedAt)
	return timeSince > 24*time.Hour
}
