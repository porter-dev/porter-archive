package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// EventRepository holds both EventContainer and SubEvent models
type EventRepository struct {
	db *gorm.DB
}

// NewEventRepository returns a EventRepository which uses
// gorm.DB for querying the database
func NewEventRepository(db *gorm.DB) repository.EventRepository {
	return &EventRepository{db}
}

func (repo EventRepository) CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo EventRepository) CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}
