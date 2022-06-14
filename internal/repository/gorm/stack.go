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
func (repo *StackRepository) ListStacks(projectID, clusterID uint, namespace string) ([]*models.Stack, error) {
	stacks := make([]*models.Stack, 0)

	if err := repo.db.Debug().
		Preload("Revisions", func(db *gorm.DB) *gorm.DB {
			return db.Debug().Order("stack_revisions.revision_number DESC").Limit(1)
		}).
		Preload("Revisions.Resources").
		Preload("Revisions.SourceConfigs").
		Where("stacks.project_id = ? AND stacks.cluster_id = ? AND stacks.namespace = ?", projectID, clusterID, namespace).Find(&stacks).Error; err != nil {
		return nil, err
	}

	return stacks, nil
}

// ReadStack gets a stack specified by its string id
func (repo *StackRepository) ReadStackByStringID(projectID uint, stackID string) (*models.Stack, error) {
	stack := &models.Stack{}

	if err := repo.db.
		Preload("Revisions", func(db *gorm.DB) *gorm.DB {
			return db.Order("stack_revisions.revision_number DESC").Limit(100)
		}).
		Preload("Revisions.Resources").
		Preload("Revisions.SourceConfigs").
		Where("stacks.project_id = ? AND stacks.uid = ?", projectID, stackID).First(&stack).Error; err != nil {
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

func (repo *StackRepository) ReadStackRevision(stackRevisionID uint) (*models.StackRevision, error) {
	revision := &models.StackRevision{}

	if err := repo.db.Preload("Resources").Preload("SourceConfigs").Where("id = ?", stackRevisionID).First(&revision).Error; err != nil {
		return nil, err
	}

	return revision, nil
}

func (repo *StackRepository) ReadStackRevisionByNumber(stackID uint, revisionNumber uint) (*models.StackRevision, error) {
	revision := &models.StackRevision{}

	if err := repo.db.Preload("Resources").Preload("SourceConfigs").Where("stack_id = ? AND revision_number = ?", stackID, revisionNumber).First(&revision).Error; err != nil {
		return nil, err
	}

	return revision, nil
}

func (repo *StackRepository) AppendNewRevision(revision *models.StackRevision) (*models.StackRevision, error) {
	stack := &models.Stack{}

	if err := repo.db.Where("id = ?", revision.StackID).First(&stack).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&stack).Association("Revisions")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(revision); err != nil {
		return nil, err
	}

	return revision, nil
}

func (repo *StackRepository) ReadStackResource(resourceID uint) (*models.StackResource, error) {
	resource := &models.StackResource{}

	if err := repo.db.Where("id = ?", resourceID).First(&resource).Error; err != nil {
		return nil, err
	}

	return resource, nil
}

func (repo *StackRepository) UpdateStackResource(resource *models.StackResource) (*models.StackResource, error) {
	if err := repo.db.Save(resource).Error; err != nil {
		return nil, err
	}

	return resource, nil
}
