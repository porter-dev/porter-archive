package test

import (
	"context"
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

// AWSAssumeRoleChain uses gorm.DB for querying the database
type AWSAssumeRoleChain struct{}

// NewAWSAssumeRoleChainer creates an AWSAssumeRoleChain connection
func NewAWSAssumeRoleChainer() repository.AWSAssumeRoleChainer {
	return &AWSAssumeRoleChain{}
}

// List returns a list of aws assume role chains for a given project, removing any chain links owned by Porter
func (cr AWSAssumeRoleChain) List(ctx context.Context, projectID uint) ([]*models.AWSAssumeRoleChain, error) {
	return nil, errors.New("not implemented")
}
