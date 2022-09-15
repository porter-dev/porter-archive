package types

import "time"

type MonitorTestStatus string

const (
	MonitorTestStatusSuccess MonitorTestStatus = "success"
	MonitorTestStatusFailed  MonitorTestStatus = "failed"
)

type MonitorTestSeverity string

const (
	MonitorTestSeverityCritical MonitorTestSeverity = "critical"
	MonitorTestSeverityHigh     MonitorTestSeverity = "high"
	MonitorTestSeverityLow      MonitorTestSeverity = "low"
)

type MonitorTestResult struct {
	ProjectID uint   `json:"project_id"`
	ClusterID uint   `json:"cluster_id"`
	Category  string `json:"category"`
	ObjectID  string `json:"object_id"`

	LastStatusChange *time.Time `json:"last_status_change"`

	LastTested    *time.Time        `json:"last_tested"`
	LastRunResult MonitorTestStatus `json:"last_run_result"`

	Title   string `json:"title"`
	Message string `json:"message"`

	Severity MonitorTestSeverity `json:"severity"`
}
