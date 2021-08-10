package gorm

import (
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// EventRepository uses gorm.DB for querying the database
type EventRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewEventRepository returns an EventRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewEventRepository(db *gorm.DB, key *[32]byte) repository.EventRepository {
	return &EventRepository{db, key}
}

// CreateEvent creates a new kube auth mechanism
func (repo *EventRepository) CreateEvent(
	event *models.Event,
) (*models.Event, error) {
	err := repo.EncryptEventData(event, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Create(event).Error; err != nil {
		return nil, err
	}

	return event, nil
}

// ReadEvent finds an event by id
func (repo *EventRepository) ReadEvent(
	id uint,
) (*models.Event, error) {
	event := &models.Event{}

	// preload Clusters association
	if err := repo.db.Where("id = ?", id).First(&event).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptEventData(event, repo.key)

	if err != nil {
		return nil, err
	}

	return event, nil
}

// ListEventsByProjectID finds all events for a given project id
// with the given options
func (repo *EventRepository) ListEventsByProjectID(
	projectID uint,
	opts *repository.ListEventOpts,
) ([]*models.Event, error) {
	listOpts := opts

	if listOpts.Limit == 0 {
		listOpts.Limit = 50
	}

	events := []*models.Event{}

	query := repo.db.Where("project_id = ?", projectID)

	if listOpts.Type != "" {
		query = repo.db.Where(
			"project_id = ? AND ref_type = ?",
			projectID,
			strings.ToLower(listOpts.Type),
		)
	}

	query = query.Limit(listOpts.Limit).Offset(listOpts.Skip)

	if listOpts.SortBy == "timestamp" {
		query = query.Order("timestamp desc").Order("id desc")
	}

	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}

	if opts.Decrypt {
		for _, event := range events {
			repo.DecryptEventData(event, repo.key)
		}
	}

	return events, nil
}

// DeleteEvent deletes an event by ID
func (repo *EventRepository) DeleteEvent(
	id uint,
) error {
	if err := repo.db.Where("id = ?", id).Delete(&models.Event{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptEventData will encrypt the event data before
// writing to the DB
func (repo *EventRepository) EncryptEventData(
	event *models.Event,
	key *[32]byte,
) error {
	if len(event.Data) > 0 {
		cipherData, err := repository.Encrypt(event.Data, key)

		if err != nil {
			return err
		}

		event.Data = cipherData
	}

	return nil
}

// DecryptEventData will decrypt the event data before
// returning it from the DB
func (repo *EventRepository) DecryptEventData(
	event *models.Event,
	key *[32]byte,
) error {
	if len(event.Data) > 0 {
		plaintext, err := repository.Decrypt(event.Data, key)

		if err != nil {
			return err
		}

		event.Data = plaintext
	}

	return nil
}
