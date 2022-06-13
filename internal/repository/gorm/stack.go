package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// StackRepository uses gorm.DB for querying the database
type StackRepository struct {
	db *gorm.DB
}

// NewStackRepository returns a StackRepository which uses
// gorm.DB for querying the database
func NewStackRepository(db *gorm.DB) repository.StackRepository {
	return &StackRepository{db}
}

// CreateStack creates a new stack
func (repo *StackRepository) CreateStack(stack *models.Stack) (*models.Stack, error) {
	if err := repo.db.Create(stack).Error; err != nil {
		return nil, err
	}

	return stack, nil
}

// ReadStack gets a stack specified by its string id
func (repo *StackRepository) ReadStackByStringID(projectID uint, stackID string) (*models.Stack, error) {
	stack := &models.Stack{}

	if err := repo.db.Preload("Revisions").Preload("Revisions.Resources").Preload("Revisions.SourceConfigs").Where("stacks.project_id = ? AND stacks.uid = ?", projectID, stackID).First(&stack).Error; err != nil {
		return nil, err
	}

	return stack, nil
}

// DeleteStack creates a new stack
func (repo *StackRepository) DeleteStack(stack *models.Stack) (*models.Stack, error) {
	if err := repo.db.Delete(stack).Error; err != nil {
		return nil, err
	}

	return stack, nil
}

func (repo *StackRepository) UpdateStackRevision(revision *models.StackRevision) (*models.StackRevision, error) {
	if err := repo.db.Save(revision).Error; err != nil {
		return nil, err
	}

	return revision, nil
}
