package repository

import "github.com/porter-dev/porter/internal/models"

// GitRepoRepository represents the set of queries on the
// GitRepo model
type TagRepository interface {
	CreateTag(tag *models.Tag) (*models.Tag, error)
	CreateOrLinkTag(tagName string, release *models.Release) error
	ReadTagByNameAndProjectId(tagName string, projectID uint) (*models.Tag, error)
	ListTagsByProjectId(projectId uint) ([]*models.Tag, error)
	UpdateTag(tag *models.Tag) (*models.Tag, error)
	DeleteTag(id uint) error
	AddTagToRelease(release *models.Release, tag *models.Tag) error
	RemoveTagFromRelease(release *models.Release, tag *models.Tag) error
	UnlinkTagsFromRelease(tags []string, release *models.Release) error
}
