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
