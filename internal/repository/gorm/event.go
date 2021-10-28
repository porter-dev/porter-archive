package gorm

import (
	"strings"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// BuildEventRepository holds both EventContainer and SubEvent models
type BuildEventRepository struct {
	db *gorm.DB
}

// NewBuildEventRepository returns a BuildEventRepository which uses
// gorm.DB for querying the database
func NewBuildEventRepository(db *gorm.DB) repository.BuildEventRepository {
	return &BuildEventRepository{db}
}

func (repo BuildEventRepository) CreateEventContainer(am *models.EventContainer) (*models.EventContainer, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo BuildEventRepository) CreateSubEvent(am *models.SubEvent) (*models.SubEvent, error) {
	if err := repo.db.Create(am).Error; err != nil {
		return nil, err
	}
	return am, nil
}

func (repo BuildEventRepository) ReadEventsByContainerID(id uint) ([]*models.SubEvent, error) {
	var events []*models.SubEvent
	if err := repo.db.Where("event_container_id = ?", id).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

func (repo BuildEventRepository) ReadEventContainer(id uint) (*models.EventContainer, error) {
	container := &models.EventContainer{}
	if err := repo.db.Where("id = ?", id).First(&container).Error; err != nil {
		return nil, err
	}
	return container, nil
}

func (repo BuildEventRepository) ReadSubEvent(id uint) (*models.SubEvent, error) {
	event := &models.SubEvent{}
	if err := repo.db.Where("id = ?", id).First(&event).Error; err != nil {
		return nil, err
	}
	return event, nil
}

// AppendEvent will check if subevent with same (id, index) already exists
// if yes, overrite it, otherwise make a new subevent
func (repo BuildEventRepository) AppendEvent(container *models.EventContainer, event *models.SubEvent) error {
	event.EventContainerID = container.ID
	return repo.db.Create(event).Error
}

// KubeEventRepository uses gorm.DB for querying the database
type KubeEventRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewKubeEventRepository returns an KubeEventRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewKubeEventRepository(db *gorm.DB, key *[32]byte) repository.KubeEventRepository {
	return &KubeEventRepository{db, key}
}

// CreateEvent creates a new kube auth mechanism
func (repo *KubeEventRepository) CreateEvent(
	event *models.KubeEvent,
) (*models.KubeEvent, error) {
	err := repo.EncryptKubeEventData(event, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Create(event).Error; err != nil {
		return nil, err
	}

	return event, nil
}

// ReadEvent finds an event by id
func (repo *KubeEventRepository) ReadEvent(
	id, projID, clusterID uint,
) (*models.KubeEvent, error) {
	event := &models.KubeEvent{}

	// preload Clusters association
	if err := repo.db.Where(
		"id = ? AND project_id = ? AND cluster_id = ?",
		id,
		projID,
		clusterID,
	).First(&event).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptKubeEventData(event, repo.key)

	if err != nil {
		return nil, err
	}

	return event, nil
}

// ListEventsByProjectID finds all events for a given project id
// with the given options
func (repo *KubeEventRepository) ListEventsByProjectID(
	projectID uint,
	clusterID uint,
	opts *types.ListKubeEventRequest,
	shouldDecrypt bool,
) ([]*models.KubeEvent, error) {
	listOpts := opts

	if listOpts.Limit == 0 {
		listOpts.Limit = 50
	}

	events := []*models.KubeEvent{}

	query := repo.db.Where("project_id = ? AND cluster_id = ?", projectID, clusterID)

	if listOpts.Type != "" {
		query = query.Where(
			"event_type = ?",
			strings.ToLower(listOpts.Type),
		)
	}

	if listOpts.OwnerName != "" && listOpts.OwnerType != "" {
		query = query.Where(
			"owner_name = ? AND owner_type = ?",
			listOpts.OwnerName,
			listOpts.OwnerType,
		)
	}

	query = query.Limit(listOpts.Limit).Offset(listOpts.Skip)

	if listOpts.SortBy == "timestamp" {
		query = query.Order("timestamp desc").Order("id desc")
	}

	if err := query.Find(&events).Error; err != nil {
		return nil, err
	}

	if shouldDecrypt {
		for _, event := range events {
			repo.DecryptKubeEventData(event, repo.key)
		}
	}

	return events, nil
}

// DeleteEvent deletes an event by ID
func (repo *KubeEventRepository) DeleteEvent(
	id uint,
) error {
	if err := repo.db.Where("id = ?", id).Delete(&models.KubeEvent{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptEventData will encrypt the event data before
// writing to the DB
func (repo *KubeEventRepository) EncryptKubeEventData(
	event *models.KubeEvent,
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
func (repo *KubeEventRepository) DecryptKubeEventData(
	event *models.KubeEvent,
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
