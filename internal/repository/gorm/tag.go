package gorm

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

func randomHex(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

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

func (repo *TagRepository) CreateOrLinkTag(tagName string, release *models.Release) error {
	project_id := release.ProjectID

	existingTag, _ := repo.ReadTagByNameAndProjectId(tagName, project_id)

	if existingTag != nil {
		return repo.AddTagToRelease(release, existingTag)
	}

	randomColor, err := randomHex(3)

	if err != nil {
		randomColor = "ffffff"
	}

	newTag := &models.Tag{
		Name:      tagName,
		ProjectID: project_id,
		Color:     strings.Join([]string{"#", randomColor}, ""),
	}

	newTag, err = repo.CreateTag(newTag)

	if err != nil {
		return err
	}

	return repo.AddTagToRelease(release, newTag)
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

	err := repo.db.Model(&models.Tag{}).Where("project_id = ?", projectId).Preload("Releases", func(tx *gorm.DB) *gorm.DB {
		return tx.Select("Name")
	}).Find(&tags).Error

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

func (repo *TagRepository) AddTagToRelease(release *models.Release, tag *models.Tag) error {
	err := repo.db.Model(&release).Association("Tags").Append(tag)
	_ = repo.db.Model(&tag).Association("Releases").Append(release)

	if err != nil {
		return err
	}

	return nil
}

func (repo *TagRepository) RemoveTagFromRelease(release *models.Release, tag *models.Tag) error {
	err := repo.db.Model(&release).Association("Tags").Delete(tag)

	if err != nil {
		return err
	}

	return nil
}
