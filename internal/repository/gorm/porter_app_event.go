package gorm

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/repository/gorm/helpers"
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

func (repo *PorterAppEventRepository) ListEventsByPorterAppID(porterAppID uint, opts ...helpers.QueryOption) ([]*models.PorterAppEvent, helpers.PaginatedResult, error) {
	apps := []*models.PorterAppEvent{}
	paginatedResult := helpers.PaginatedResult{}

	id := strconv.Itoa(int(porterAppID))
	if id == "" {
		return nil, paginatedResult, errors.New("invalid porter app id supplied")
	}

	db := repo.db.Model(&models.PorterAppEvent{})
	db = db.Scopes(helpers.Paginate(db, &paginatedResult, opts...))

	if err := db.Where("porter_app_id = ?", id).Find(&apps).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, paginatedResult, err
		}
	}

	return apps, paginatedResult, nil
}

func (repo *PorterAppEventRepository) EventByID(eventID uuid.UUID) (*models.PorterAppEvent, error) {
	app := &models.PorterAppEvent{}

	if eventID == uuid.Nil {
		return app, errors.New("invalid porter app event id supplied")
	}

	tx := repo.db.Find(&app, "id = ?", eventID.String())
	if tx.Error != nil {
		return app, fmt.Errorf("no porter app event found for id %s: %w", eventID, tx.Error)
	}

	return app, nil
}
