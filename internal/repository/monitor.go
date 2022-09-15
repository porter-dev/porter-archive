package repository

import "github.com/porter-dev/porter/internal/models"

type MonitorTestResultRepository interface {
	CreateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error)
	ReadMonitorTestResult(projectID, clusterID uint, operationID string) (*models.MonitorTestResult, error)
	UpdateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error)
}
