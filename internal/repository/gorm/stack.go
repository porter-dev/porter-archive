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
	query := repo.db.Where("stacks.project_id = ? AND stacks.cluster_id = ?", projectID, clusterID)

	if namespace != "" {
		query = query.Where("stacks.namespace = ?", namespace)
	}

	// get stack IDs
	if err := query.Find(&stacks).Error; err != nil {
		return nil, err
	}

	stackIDs := make([]uint, 0)

	for _, initStack := range stacks {
		stackIDs = append(stackIDs, initStack.ID)
	}

	// query for each stack's revision
	revisions := make([]*models.StackRevision, 0)

	if err := repo.db.Preload("SourceConfigs").Preload("Resources").Preload("EnvGroups").Where("stack_revisions.stack_id IN (?)", stackIDs).Where(`
	stack_revisions.id IN (
	  SELECT s2.id FROM (SELECT MAX(stack_revisions.id) id FROM stack_revisions WHERE stack_revisions.stack_id IN (?) GROUP BY stack_revisions.stack_id) s2
	)
  `, stackIDs).Find(&revisions).Error; err != nil {
		return nil, err
	}

	// insert revisions into a map
	stackIDToRevisionMap := make(map[uint]models.StackRevision)

	for _, revision := range revisions {
		stackIDToRevisionMap[revision.StackID] = *revision
	}

	// look up each revision for each stack
	for _, stack := range stacks {
		if _, exists := stackIDToRevisionMap[stack.ID]; exists {
			stack.Revisions = append(stack.Revisions, stackIDToRevisionMap[stack.ID])
		}
	}

	return stacks, nil
}

func (repo *StackRepository) ReadStackByID(projectID, stackID uint) (*models.Stack, error) {
	stack := &models.Stack{}

	if err := repo.db.
		Preload("Revisions", func(db *gorm.DB) *gorm.DB {
			return db.Order("stack_revisions.revision_number DESC").Limit(100)
		}).
		Preload("Revisions.Resources").
		Preload("Revisions.SourceConfigs").
		Preload("Revisions.EnvGroups").
		Where("stacks.project_id = ? AND stacks.id = ?", projectID, stackID).First(&stack).Error; err != nil {
		return nil, err
	}

	return stack, nil
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
		Preload("Revisions.EnvGroups").
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

	if err := repo.db.Preload("Resources").Preload("SourceConfigs").Preload("EnvGroups").Where("id = ?", stackRevisionID).First(&revision).Error; err != nil {
		return nil, err
	}

	return revision, nil
}

func (repo *StackRepository) ReadStackRevisionByNumber(stackID uint, revisionNumber uint) (*models.StackRevision, error) {
	revision := &models.StackRevision{}

	if err := repo.db.Preload("Resources").Preload("SourceConfigs").Preload("EnvGroups").Where("stack_id = ? AND revision_number = ?", stackID, revisionNumber).First(&revision).Error; err != nil {
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

func (repo *StackRepository) ReadStackEnvGroupFirstMatch(projectID, clusterID uint, namespace, name string) (*models.StackEnvGroup, error) {
	envGroup := &models.StackEnvGroup{}

	if err := repo.db.Where("project_id = ? AND cluster_id = ? AND namespace = ? AND name = ?", projectID, clusterID, namespace, name).Order("id desc").First(&envGroup).Error; err != nil {
		return nil, err
	}

	return envGroup, nil
}
