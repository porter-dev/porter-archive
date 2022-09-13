package models

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

type MonitorTestResult struct {
	gorm.Model

	ProjectID uint
	ClusterID uint
	Category  string
	ObjectID  string

	LastStatusChange *time.Time
	LastTested       *time.Time
	LastRunResult    string

	Title   string
	Message string

	Severity string
}

func (m *MonitorTestResult) ToMonitorTestResultType() *types.MonitorTestResult {
	return &types.MonitorTestResult{
		ProjectID:        m.ProjectID,
		ClusterID:        m.ClusterID,
		Category:         m.Category,
		ObjectID:         m.ObjectID,
		LastStatusChange: m.LastStatusChange,
		LastTested:       m.LastTested,
		LastRunResult:    types.MonitorTestStatus(m.LastRunResult),
		Title:            m.Title,
		Message:          m.Message,
		Severity:         types.MonitorTestSeverity(m.Severity),
	}
}
