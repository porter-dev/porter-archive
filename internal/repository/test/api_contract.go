package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// APIContractRepository uses gorm.DB for querying the database
type APIContractRepository struct {
	db *gorm.DB
}

// NewAPIContractRevisioner creates an APIRevision connection
func NewAPIContractRevisioner() repository.APIContractRevisioner {
	return &APIContractRepository{}
}

// Insert creates a new record in the api_contract_revisions table
func (cr APIContractRepository) Insert(ctx context.Context, conf models.APIContractRevision) (models.APIContractRevision, error) {
	return conf, errors.New("not implemented")
}

// List returns a list of api contract revisions sorted by created date for a given project and cluster
func (cr APIContractRepository) List(ctx context.Context, projectID uint, clusterID uint) ([]models.APIContractRevision, error) {
	var confs []models.APIContractRevision
	return confs, errors.New("not implemented")
}
