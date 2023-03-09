package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// CAPIConfigRepository uses gorm.DB for querying the database
type CAPIConfigRepository struct {
	db *gorm.DB
}

// NewCAPIConfigRepository creates a CAPIConfig connection
func NewCAPIConfigRepository(db *gorm.DB) repository.CAPIConfigRepository {
	return &CAPIConfigRepository{db}
}

// Insert creates a new record in the capi_configs table
func (cr CAPIConfigRepository) Insert(ctx context.Context, conf models.CAPIConfig) (models.CAPIConfig, error) {
	tx := cr.db.Create(&conf)
	if tx.Error != nil {
		return conf, tx.Error
	}
	return conf, nil
}

// List returns a list of capi configs sorted by created date for a given project and cluster
func (cr CAPIConfigRepository) List(ctx context.Context, projectID uint, clusterID uint) ([]models.CAPIConfig, error) {
	var confs []models.CAPIConfig

	tx := cr.db.Preload("capi_configs").Where("project_id = ? and cluster_id = ?", projectID, clusterID).Order("created_at").Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}
