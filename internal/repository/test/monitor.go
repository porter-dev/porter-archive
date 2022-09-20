package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type MonitorTestResultRepository struct{}

func NewMonitorTestResultRepository(canQuery bool) repository.MonitorTestResultRepository {
	return &MonitorTestResultRepository{}
}

func (n *MonitorTestResultRepository) CreateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error) {
	panic("not implemented") // TODO: Implement
}

func (n *MonitorTestResultRepository) ReadMonitorTestResult(projectID, clusterID uint, operationID string) (*models.MonitorTestResult, error) {
	panic("not implemented") // TODO: Implement
}

func (n *MonitorTestResultRepository) UpdateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error) {
	panic("not implemented") // TODO: Implement
}

func (n *MonitorTestResultRepository) ArchiveMonitorTestResults(recommenderID string) error {
	panic("not implemented") // TODO: Implement
}

func (n *MonitorTestResultRepository) DeleteOldMonitorTestResults(recommenderID string) error {
	panic("not implemented") // TODO: Implement
}
