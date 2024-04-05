package gorm

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// SystemServiceStatusRepository uses gorm.DB for querying the database
type SystemServiceStatusRepository struct {
	db *gorm.DB
}

// NewSystemServiceStatusRepository returns a SystemServiceStatusRepository which uses
// gorm.DB for querying the database
func NewSystemServiceStatusRepository(db *gorm.DB) repository.SystemServiceStatusRepository {
	return &SystemServiceStatusRepository{db}
}

func (repo *SystemServiceStatusRepository) ReadSystemServiceStatus(ctx context.Context, id uuid.UUID) (models.SystemServiceStatus, error) {
	status := models.SystemServiceStatus{}

	if id == uuid.Nil {
		return status, errors.New("invalid porter app event id supplied")
	}

	strID := id.String()

	if err := repo.db.Where("id = ?", strID).First(&status).Error; err != nil {
		return status, err
	}

	return status, nil
}
