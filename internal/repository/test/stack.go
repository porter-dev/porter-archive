package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type StackRepository struct{}

func NewStackRepository() repository.StackRepository {
	return &StackRepository{}
}

// CreateStack creates a new stack
func (repo *StackRepository) CreateStack(stack *models.Stack) (*models.Stack, error) {
	panic("unimplemented")
}

// ReadStack gets a stack specified by its string id
func (repo *StackRepository) ListStacks(projectID, clusterID uint, namespace string) ([]*models.Stack, error) {
	panic("unimplemented")
}

func (repo *StackRepository) ReadStackByID(projectID, stackID uint) (*models.Stack, error) {
	panic("unimplemented")
}

// ReadStack gets a stack specified by its string id
func (repo *StackRepository) ReadStackByStringID(projectID uint, stackID string) (*models.Stack, error) {
	panic("unimplemented")
}

// DeleteStack creates a new stack
func (repo *StackRepository) DeleteStack(stack *models.Stack) (*models.Stack, error) {
	panic("unimplemented")
}

func (repo *StackRepository) UpdateStackRevision(revision *models.StackRevision) (*models.StackRevision, error) {
	panic("unimplemented")
}

func (repo *StackRepository) ReadStackRevision(stackRevisionID uint) (*models.StackRevision, error) {
	panic("unimplemented")
}

func (repo *StackRepository) ReadStackRevisionByNumber(stackID uint, revisionNumber uint) (*models.StackRevision, error) {
	panic("unimplemented")
}

func (repo *StackRepository) AppendNewRevision(revision *models.StackRevision) (*models.StackRevision, error) {
	panic("unimplemented")
}

func (repo *StackRepository) ReadStackResource(resourceID uint) (*models.StackResource, error) {
	panic("unimplemented")
}

func (repo *StackRepository) UpdateStackResource(resource *models.StackResource) (*models.StackResource, error) {
	panic("unimplemented")
}

func (repo *StackRepository) ReadStackEnvGroupFirstMatch(projectID, clusterID uint, namespace, name string) (*models.StackEnvGroup, error) {
	panic("unimplemented")
}
