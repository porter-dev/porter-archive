package types

import "time"

type UsageMetric string

const (
	CPU      UsageMetric = "cpu"
	Memory   UsageMetric = "memory"
	Clusters UsageMetric = "clusters"
	Users    UsageMetric = "users"
)

type ProjectUsage struct {
	// The CPU usage, in vCPUs
	ResourceCPU uint `json:"resource_cpu"`

	// The memory usage, in mibibytes (?)
	ResourceMemory uint `json:"resource_memory"`

	// The number of clusters
	Clusters uint `json:"clusters"`

	// The number of users
	Users uint `json:"users"`
}

var BasicPlan = ProjectUsage{
	ResourceCPU: 10,
	// 20 GB converted to Mebibytes
	ResourceMemory: 19074,
	Clusters:       1,
	Users:          1,
}

var TeamPlan = ProjectUsage{
	ResourceCPU: 20,
	// 40 GB converted to Mebibytes
	ResourceMemory: 38148,
	Clusters:       3,
	Users:          3,
}

var GrowthPlan = ProjectUsage{
	ResourceCPU: 80,
	// 160 GB converted to Mebibytes
	ResourceMemory: 152592,
	Clusters:       0,
	Users:          5,
}

// all unlimited
var EnterprisePlan = ProjectUsage{
	ResourceCPU:    0,
	ResourceMemory: 0,
	Clusters:       0,
	Users:          0,
}

type GetProjectUsageResponse struct {
	Current ProjectUsage `json:"current"`
	Limit   ProjectUsage `json:"limit"`

	// Whether the usage is exceeded
	IsExceeded bool `json:"exceeded"`

	// When the usage has been exceeded since, if IsExceeded
	ExceededSince *time.Time `json:"exceeded_since,omitempty"`
}
