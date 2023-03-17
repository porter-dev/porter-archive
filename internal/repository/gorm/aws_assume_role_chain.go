package gorm

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AWSAssumeRoleChain uses gorm.DB for querying the database
type AWSAssumeRoleChain struct {
	db *gorm.DB
}

// NewAPIContractRevisioner creates an APIRevision connection
func NewAWSAssumeRoleChainer(db *gorm.DB) repository.AWSAssumeRoleChainer {
	return &AWSAssumeRoleChain{db}
}

// List returns a list of aws assume role chains where the target arn is not owned by Porter.
// This allows for only returning the customer ARNs
func (cr AWSAssumeRoleChain) List(ctx context.Context, projectID uint) ([]*models.AWSAssumeRoleChain, error) {
	var confs []*models.AWSAssumeRoleChain

	if projectID == 0 {
		return nil, errors.New("must provide a project ID")
	}
	tx := cr.db.Where("project_id = ? and target_arn not like '%arn:aws:iam::108458755588%'", projectID).Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}
