package gorm

import (
	"context"
	"errors"

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
func (cr APIContractRepository) List(ctx context.Context, projectID uint, clusterID uint) ([]*models.APIContractRevision, error) {
	var confs []*models.APIContractRevision

	if clusterID == 0 {
		tx := cr.db.Where("project_id = ?", projectID).Find(&confs)
		if tx.Error != nil {
			return nil, tx.Error
		}
		return confs, nil
	}
	tx := cr.db.Where("project_id = ? and cluster_id = ?", projectID, clusterID).Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}

// Delete deleted a record in the api_contract_revisions table
func (cr APIContractRepository) Delete(ctx context.Context, projectID uint, clusterID uint, revisionID uuid.UUID) error {

	conf := models.APIContractRevision{
		ID:        revisionID,
		ProjectID: int(projectID),
	}

	if clusterID != 0 {
		conf.ClusterID = int(clusterID)
	}

	tx := cr.db.Delete(&conf)
	if tx.Error != nil {
		return tx.Error
	}
	return nil
}

// Get returns a record in the api_contract_revisions table
func (cr APIContractRepository) Get(ctx context.Context, revisionID uuid.UUID) (models.APIContractRevision, error) {

	if revisionID == uuid.Nil {
		return models.APIContractRevision{}, errors.New("invalid contract revision id supplied")
	}

	rev, ok := cr.db.Get(revisionID.String())
	if !ok {
		return models.APIContractRevision{}, errors.New("no contract revision found for that id")
	}

	if revision, ok := rev.(models.APIContractRevision); ok {
		return revision, nil
	}

	return models.APIContractRevision{}, errors.New("unable to convert response to contract revision")
}
