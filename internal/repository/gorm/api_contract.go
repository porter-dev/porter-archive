package gorm

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
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
// If latest is true, it will only return the latest revision for each contract
func (cr APIContractRepository) List(ctx context.Context, projectID uint, filters ...repository.APIContractRevisionFilters) ([]*models.APIContractRevision, error) {
	ctx, span := telemetry.NewSpan(ctx, "list-api-contract-revisions")
	defer span.End()

	var opts repository.APIContractRevisionFilter
	for _, opt := range filters {
		opt(&opts)
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "project-id", Value: projectID},
		telemetry.AttributeKV{Key: "cluster-id", Value: opts.ClusterID},
		telemetry.AttributeKV{Key: "latest", Value: opts.Latest},
	)

	if projectID == 0 {
		return nil, telemetry.Error(ctx, span, nil, "project id cannot be 0")
	}

	if opts.Latest {
		return cr.Latest(ctx, projectID, filters...)
	}

	var confs []*models.APIContractRevision
	query := cr.db.Model(&models.APIContractRevision{}).Where("project_id = ?", projectID)

	if opts.ClusterID != 0 {
		query = query.Where("cluster_id = ?", opts.ClusterID)
	}

	if err := query.Find(&confs).Error; err != nil {
		return nil, err
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

	var acr models.APIContractRevision
	tx := cr.db.Find(&acr, "id = ?", revisionID.String())
	if tx.Error != nil {
		return models.APIContractRevision{}, fmt.Errorf("no contract revision found for id %s: %w", revisionID, tx.Error)
	}

	return acr, nil
}

// Latest returns the latest version for each contract specified by filters
func (cr APIContractRepository) Latest(ctx context.Context, projectID uint, filters ...repository.APIContractRevisionFilters) ([]*models.APIContractRevision, error) {
	var confs []*models.APIContractRevision

	var opts repository.APIContractRevisionFilter
	for _, opt := range filters {
		opt(&opts)
	}

	queryString := `
		SELECT DISTINCT ON (cluster_id) *
		FROM api_contract_revisions
		WHERE project_id = ?
		ORDER BY cluster_id, created_at DESC
    `
	args := []any{projectID}

	if opts.ClusterID != 0 {
		queryString = `
			SELECT DISTINCT ON (cluster_id) *
			FROM api_contract_revisions
			WHERE project_id = ?
			ORDER BY cluster_id, created_at DESC
    	`
		args = append(args, opts.ClusterID)
	}

	tx := cr.db.Raw(queryString, args...).Scan(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}
