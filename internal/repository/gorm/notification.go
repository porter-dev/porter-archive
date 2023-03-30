package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type NotificationConfigRepository struct {
	db *gorm.DB
}

// NewNotificationConfigRepository creates a new NotificationConfigRepository
func NewNotificationConfigRepository(db *gorm.DB) repository.NotificationConfigRepository {
	return NotificationConfigRepository{db: db}
}

// CreateNotificationConfig creates a new NotificationConfig
func (repo NotificationConfigRepository) CreateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

// ReadNotificationConfig reads a NotificationConfig by ID
func (repo NotificationConfigRepository) ReadNotificationConfig(id uint) (*models.NotificationConfig, error) {
	ret := &models.NotificationConfig{}

	if err := repo.db.Where("id = ?", id).First(&ret).Error; err != nil {
		return nil, err
	}

	return ret, nil
}

// UpdateNotificationConfig updates a given NotificationConfig
func (repo NotificationConfigRepository) UpdateNotificationConfig(am *models.NotificationConfig) (*models.NotificationConfig, error) {
	if err := repo.db.Save(am).Error; err != nil {
		return nil, err
	}

	return am, nil
}

type JobNotificationConfigRepository struct {
	db *gorm.DB
}

// NewJobNotificationConfigRepository creates a new JobNotificationConfigRepository
func NewJobNotificationConfigRepository(db *gorm.DB) repository.JobNotificationConfigRepository {
	return JobNotificationConfigRepository{db: db}
}

// CreateNotificationConfig creates a new JobNotificationConfig
func (repo JobNotificationConfigRepository) CreateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error) {
	var count int64

	query := repo.db.Where("project_id = ? AND cluster_id = ?", am.ProjectID, am.ClusterID)

	if err := query.Model([]*models.JobNotificationConfig{}).Count(&count).Error; err != nil {
		return nil, err
	}

	// if the count is greater than 1000, remove the lowest-order events to implement a
	// basic fixed-length buffer
	if count >= 1000 {
		err := repo.db.Exec(`
			  DELETE FROM job_notification_configs 
			  WHERE project_id = ? AND cluster_id = ? AND 
			  id NOT IN (
				SELECT id FROM job_notification_configs j2 WHERE j2.project_id = ? AND j2.cluster_id = ? ORDER BY j2.updated_at desc, j2.id desc LIMIT 999
			  )
			`, am.ProjectID, am.ClusterID, am.ProjectID, am.ClusterID).Error
		if err != nil {
			return nil, err
		}
	}

	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}

	return am, nil
}

// ReadNotificationConfig reads a JobNotificationConfig by ID
func (repo JobNotificationConfigRepository) ReadNotificationConfig(projID, clusterID uint, name, namespace string) (*models.JobNotificationConfig, error) {
	ret := &models.JobNotificationConfig{}

	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND name = ? AND namespace = ?", projID, clusterID, name, namespace).First(&ret).Error; err != nil {
		return nil, err
	}

	return ret, nil
}

// UpdateNotificationConfig updates a given JobNotificationConfig
func (repo JobNotificationConfigRepository) UpdateNotificationConfig(am *models.JobNotificationConfig) (*models.JobNotificationConfig, error) {
	if err := repo.db.Save(am).Error; err != nil {
		return nil, err
	}

	return am, nil
}
