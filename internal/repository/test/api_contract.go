package test

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// APIContractRepository uses gorm.DB for querying the database
type APIContractRepository struct{}

// NewAPIContractRevisioner creates an APIRevision connection
func NewAPIContractRevisioner() repository.APIContractRevisioner {
	return &APIContractRepository{}
}

// Insert creates a new record in the api_contract_revisions table
func (cr APIContractRepository) Insert(ctx context.Context, conf models.APIContractRevision) (models.APIContractRevision, error) {
	return conf, errors.New("not implemented")
}

// List returns a list of api contract revisions sorted by created date for a given project and cluster
func (cr APIContractRepository) List(ctx context.Context, projectID uint, clusterID uint) ([]*models.APIContractRevision, error) {
	var confs []*models.APIContractRevision
	return confs, errors.New("not implemented")
}

func (cr APIContractRepository) Delete(ctx context.Context, projectID uint, clusterID uint, revisionID uuid.UUID) error {
	return errors.New("not implemented")
}

func (cr APIContractRepository) Get(ctx context.Context, revisionID uuid.UUID) (models.APIContractRevision, error) {
	return models.APIContractRevision{}, errors.New("not implemented")
}
