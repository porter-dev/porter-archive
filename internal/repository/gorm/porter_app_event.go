package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PorterAppEventRepository uses gorm.DB for querying the database
type PorterAppEventRepository struct {
	db *gorm.DB
}

// NewPorterAppEventRepository returns a PorterAppEventRepository which uses
// gorm.DB for querying the database
func NewPorterAppEventRepository(db *gorm.DB) repository.PorterAppEventRepository {
	return &PorterAppEventRepository{db}
}

func (repo *PorterAppEventRepository) ListEventsByPorterAppID(porterAppID uint) ([]*models.PorterAppEvent, error) {
	apps := []*models.PorterAppEvent{}

	if err := repo.db.Where("porter_app_id = ?", porterAppID).Find(&apps).Error; err != nil {
		return nil, err
	}

	return apps, nil
}
