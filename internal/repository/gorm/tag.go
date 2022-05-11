package gorm

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AllowlistRepository uses gorm.DB for querying the database
type TagRepository struct {
	db *gorm.DB
}

// NewAllowlistRepository returns a AllowListRepository which uses
// gorm.DB for querying the database.
func NewTagRepository(db *gorm.DB) repository.TagRepository {
	return &TagRepository{db}
}

func (repo *TagRepository) CreateTag(tag *models.Tag) (*models.Tag, error) {
	existingTag, _ := repo.ReadTagByNameAndProjectId(tag.Name, tag.ProjectID)

	if existingTag != nil {
		return nil, fmt.Errorf("tag already exists")
	}

	if err := repo.db.Create(tag).Error; err != nil {
		return nil, err
	}
	return tag, nil
}

func (repo *TagRepository) LinkTagsToRelease(tags []string, release *models.Release) ([]*models.Tag, error) {
	populatedTags := make([]*models.Tag, 0)
	err := repo.db.Where("name IN ?", tags).Where("project_id = ?", release.ProjectID).Find(&populatedTags).Error

	if err != nil {
		return nil, err
	}

	release.Tags = populatedTags

	err = repo.db.Save(release).Error

	if err != nil {
		return nil, err
	}

	return populatedTags, nil
}

func (repo *TagRepository) UnlinkTagsFromRelease(tags []string, release *models.Release) error {
	populatedTags := make([]*models.Tag, 0)
	err := repo.db.Where("name IN ?", tags).Where("project_id = ?", release.ProjectID).Find(&populatedTags).Error

	if err != nil {
		return err
	}

	err = repo.db.Model(&release).Association("Tags").Delete(populatedTags)

	if err != nil {
		return err
	}

	return nil
}

func (repo *TagRepository) ReadTagByNameAndProjectId(tagName string, projectId uint) (*models.Tag, error) {
	tag := &models.Tag{}

	err := repo.db.Where("name = ? AND project_id = ?", tagName, projectId).First(tag).Error

	if err != nil {
		return nil, err
	}

	return tag, nil
}

func (repo *TagRepository) ListTagsByProjectId(projectId uint) ([]*models.Tag, error) {
	tags := make([]*models.Tag, 0)

	err := repo.db.Preload("Releases").Where("project_id = ?", projectId).Find(&tags).Error

	if err != nil {
		return nil, err
	}

	return tags, nil
}

func (repo *TagRepository) UpdateTag(tag *models.Tag) (*models.Tag, error) {
	existingTag, _ := repo.ReadTagByNameAndProjectId(tag.Name, tag.ProjectID)

	if existingTag != nil {
		return nil, fmt.Errorf("tag already exists")
	}

	if err := repo.db.Save(tag).Error; err != nil {
		return nil, err
	}

	return tag, nil
}

func (repo *TagRepository) DeleteTag(id uint) error {
	if err := repo.db.Delete(&models.Tag{}, id).Error; err != nil {
		return err
	}

	return nil
}
