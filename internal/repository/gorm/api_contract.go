package gorm

import (
	"context"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// APIContractRepository uses gorm.DB for querying the database
type APIContractRepository struct {
	db *gorm.DB
}

// NewAPIContractRevisioner creates an APIRevision connection
func NewAPIContractRevisioner(db *gorm.DB) repository.APIContractRevisioner {
	return &APIContractRepository{db}
}

// Insert creates a new record in the api_contract_revisions table
func (cr APIContractRepository) Insert(ctx context.Context, conf models.APIContractRevision) (models.APIContractRevision, error) {
	if conf.ID == uuid.Nil {
		conf.ID = uuid.New()
	}
	tx := cr.db.Create(&conf)
	if tx.Error != nil {
		return conf, tx.Error
	}
	return conf, nil
}

// List returns a list of api contract revisions sorted by created date for a given projectID.
// If clusterID is not specified (set to 0), this will return all revisions for a given project
func (cr APIContractRepository) List(ctx context.Context, projectID uint, clusterID uint) ([]models.APIContractRevision, error) {
	var confs []models.APIContractRevision

	if clusterID == 0 {
		tx := cr.db.Preload("api_contract_revisions").Where("project_id = ?", projectID, clusterID).Order("created_at").Find(&confs)
		if tx.Error != nil {
			return nil, tx.Error
		}
		return confs, nil
	}
	tx := cr.db.Preload("api_contract_revisions").Where("project_id = ? and cluster_id = ?", projectID, clusterID).Order("created_at").Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}
