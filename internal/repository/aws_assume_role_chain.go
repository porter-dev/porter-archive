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
}
