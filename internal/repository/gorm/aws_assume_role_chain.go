package gorm

import (
	"context"
	"errors"
	"fmt"

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
	// porterInternalAccounts are accounts which should be hidden from users, such as bastion or production accounts
	porterInternalAccounts := []string{
		"108458755588", // CAPI Bastion
		"813111008191", // Internal Tooling Cluster
		"975032674314", // Old production account
	}

	query := "project_id = ?"
	for _, account := range porterInternalAccounts {
		query += fmt.Sprintf(" and target_arn not like '%%arn:aws:iam::%s%%'", account)
	}

	tx := cr.db.Where(query, projectID).Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}

// ListByAwsAccountId returns a list of aws assume role chains where the target arn is owned by the supplied AWS account ID.
func (cr AWSAssumeRoleChain) ListByAwsAccountId(ctx context.Context, awsAccountID string) ([]*models.AWSAssumeRoleChain, error) {
	var confs []*models.AWSAssumeRoleChain
	if awsAccountID == "" {
		return nil, errors.New("must provide an AWS account ID")
	}
	if len(awsAccountID) != 12 {
		return nil, fmt.Errorf("must provide a valid AWS account ID: %s", awsAccountID)
	}

	targetArn := fmt.Sprintf("arn:aws:iam::%s:role/porter-manager", awsAccountID)
	tx := cr.db.Where("target_arn = ?", targetArn).Find(&confs)
	if tx.Error != nil {
		return nil, tx.Error
	}

	return confs, nil
}

// Delete deletes an AWS assume role chain by project ID
func (cr AWSAssumeRoleChain) Delete(ctx context.Context, projectID uint) error {
	if projectID == 0 {
		return errors.New("must provide a project ID")
	}

	var confs []*models.AWSAssumeRoleChain
	tx := cr.db.Where("project_id = ?", projectID).Find(&confs)
	if tx.Error != nil {
		return tx.Error
	}

	for _, conf := range confs {
		tx := cr.db.Delete(conf)
		if tx.Error != nil {
			return tx.Error
		}
	}

	return nil
}
