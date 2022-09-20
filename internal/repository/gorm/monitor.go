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

func (m *MonitorTestResultRepository) ArchiveMonitorTestResults(recommenderID string) error {
	query := m.db.Debug().Unscoped().Model(&models.MonitorTestResult{}).Where("last_recommender_run_id != ?", recommenderID)

	return query.Update("archived", true).Error
}

func (m *MonitorTestResultRepository) DeleteOldMonitorTestResults(recommenderID string) error {
	monitors := make([]*models.MonitorTestResult, 0)

	query := m.db.Debug().Unscoped().Where("last_recommender_run_id != ?", recommenderID)

	// we need to switch on the database type to delete records older than 24 hours
	switch m.db.Dialector.Name() {
	case "sqlite":
		query = query.Where(
			"last_tested < DATETIME('now', '-1 day')",
		)
	case "postgres":
		query = query.Where(
			"last_tested < NOW() - INTERVAL '1 day'",
		)
	}

	return query.Delete(monitors).Error
}
