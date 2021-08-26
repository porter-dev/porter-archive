package gorm

import (
	"fmt"
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

func (repo EventRepository) ReadEventsByContainerID(id uint) ([]*models.SubEvent, error) {
	var events []*models.SubEvent
	if err := repo.db.Where("event_container_id = ?", id).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (repo EventRepository) ReadEventContainer(id uint) (*models.EventContainer, error) {
	container := &models.EventContainer{}
	if err := repo.db.Where("id = ?", id).First(&container).Error; err != nil {
		return nil, err
	}
	return container, nil
}

func (repo EventRepository) ReadSubEvent(id uint) (*models.SubEvent, error) {
	event := &models.SubEvent{}
	if err := repo.db.Where("id = ?", id).First(&event).Error; err != nil {
		return nil, err
	}
	return event, nil
}

// AppendEvent will check if subevent with same (id, index) already exists
// if yes, overrite it, otherwise make a new subevent
func (repo EventRepository) AppendEvent(container *models.EventContainer, event *models.SubEvent) error {
	subevent := &models.SubEvent{}

	if err := repo.db.Where("event_container_id = ? AND event_id = ? AND index = ?",
		container.ID,
		event.EventID,
		event.Index).First(&subevent).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := repo.db.Create(event).Error; err != nil {
				return err
			}
			return nil
		} else {
			return err
		}
	}

	subevent.Info = event.Info
	subevent.Status = event.Status
	subevent.Name = event.Name

	return repo.db.Save(subevent).Error
}
