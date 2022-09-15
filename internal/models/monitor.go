package models

import (
	"strings"
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

	LastStatusChange  *time.Time
	LastTested        *time.Time
	LastRunResult     string
	LastRunResultEnum uint

	Title   string
	Message string

	Severity     string
	SeverityEnum uint
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

func GetSeverityEnum(severity string) uint {
	switch strings.ToLower(severity) {
	case string(types.MonitorTestSeverityCritical):
		return 2
	case string(types.MonitorTestSeverityHigh):
		return 1
	default:
		return 0
	}
}

func GetLastRunResultEnum(lastRunResult string) uint {
	switch strings.ToLower(lastRunResult) {
	case string(types.MonitorTestStatusFailed):
		return 1
	default:
		return 0
	}
}
