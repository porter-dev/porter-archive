package repository

import "github.com/porter-dev/porter/internal/models"

// StackRepository represents the set of queries on the Stack model
type StackRepository interface {
	CreateStack(stack *models.Stack) (*models.Stack, error)
	ReadStackByID(projectID, stackID uint) (*models.Stack, error)
	ReadStackByStringID(projectID uint, stackID string) (*models.Stack, error)
	ListStacks(projectID uint, clusterID uint, namespace string) ([]*models.Stack, error)
	DeleteStack(stack *models.Stack) (*models.Stack, error)

	UpdateStackRevision(revision *models.StackRevision) (*models.StackRevision, error)
	ReadStackRevision(stackRevisionID uint) (*models.StackRevision, error)
	ReadStackRevisionByNumber(stackID uint, revisionNumber uint) (*models.StackRevision, error)
	AppendNewRevision(revision *models.StackRevision) (*models.StackRevision, error)

	ReadStackResource(resourceID uint) (*models.StackResource, error)
	UpdateStackResource(resource *models.StackResource) (*models.StackResource, error)
}
