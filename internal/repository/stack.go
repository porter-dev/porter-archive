package repository

import "github.com/porter-dev/porter/internal/models"

// StackRepository represents the set of queries on the Stack model
type StackRepository interface {
	CreateStack(stack *models.Stack) (*models.Stack, error)
	ReadStackByStringID(projectID uint, stackID string) (*models.Stack, error)
	DeleteStack(stack *models.Stack) (*models.Stack, error)
	UpdateStackRevision(revision *models.StackRevision) (*models.StackRevision, error)
}
