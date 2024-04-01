package repository

import (
	"context"

	"github.com/porter-dev/porter/internal/models"
)

// AWSAssumeRoleChainer represents queries on the aws_assume_role_chain table,
// which stores all assume role chain hops
type AWSAssumeRoleChainer interface {
	// List returns the final hop in an assume role chain, where the ARN accounts
	// are not owned by Porter
	List(ctx context.Context, projectID uint) ([]*models.AWSAssumeRoleChain, error)
	// ListByAwsAccountId returns the final hops in an assume role chain, where the ARN accounts match the supplied AWS account ID
	ListByAwsAccountId(ctx context.Context, targetAwsAccountId string) ([]*models.AWSAssumeRoleChain, error)
	// Delete deletes an AWS assume role chain by project ID
	Delete(ctx context.Context, projectID uint) error
}
