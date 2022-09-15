package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// MonitorTestResultRepository contains methods for querying MonitorTestResult models
type MonitorTestResultRepository struct {
	db *gorm.DB
}

// NewBuildEventRepository returns a BuildEventRepository which uses
// gorm.DB for querying the database
func NewMonitorTestResultRepository(db *gorm.DB) repository.MonitorTestResultRepository {
	return &MonitorTestResultRepository{db}
}

func (m *MonitorTestResultRepository) CreateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error) {
	if err := m.db.Create(monitor).Error; err != nil {
		return nil, err
	}

	return monitor, nil
}

func (m *MonitorTestResultRepository) ReadMonitorTestResult(projectID, clusterID uint, objectID string) (*models.MonitorTestResult, error) {
	res := &models.MonitorTestResult{}

	if err := m.db.Where("project_id = ? AND cluster_id = ? AND object_id = ?", projectID, clusterID, objectID).First(res).Error; err != nil {
		return nil, err
	}

	return res, nil
}

func (m *MonitorTestResultRepository) UpdateMonitorTestResult(monitor *models.MonitorTestResult) (*models.MonitorTestResult, error) {
	if err := m.db.Save(monitor).Error; err != nil {
		return nil, err
	}

	return monitor, nil
}
