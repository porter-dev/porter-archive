package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type TagRepository struct {
}

func NewTagRepository() repository.TagRepository {
	return &TagRepository{}
}

func (repo *TagRepository) CreateTag(tag *models.Tag) (*models.Tag, error) {
	panic("not implemented")
}
func (repo *TagRepository) ReadTagByNameAndProjectId(tagName string, projectID uint) (*models.Tag, error) {
	panic("not implemented")
}
func (repo *TagRepository) ListTagsByProjectId(projectId uint) ([]*models.Tag, error) {
	panic("not implemented")
}
func (repo *TagRepository) UpdateTag(tag *models.Tag) (*models.Tag, error) {
	panic("not implemented")
}
func (repo *TagRepository) DeleteTag(id uint) error {
	panic("not implemented")
}
func (repo *TagRepository) UnlinkTagsFromRelease(tags []string, release *models.Release) error {
	panic("not implemented")
}
func (repo *TagRepository) LinkTagsToRelease(tags []string, release *models.Release) ([]*models.Tag, error) {
	panic("not implemented")
}
