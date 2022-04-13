package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// ReleaseRepository uses gorm.DB for querying the database
type ReleaseRepository struct {
	db *gorm.DB
}

// NewReleaseRepository returns a DefaultReleaseRepository which uses
// gorm.DB for querying the database
func NewReleaseRepository(db *gorm.DB) repository.ReleaseRepository {
	return &ReleaseRepository{db}
}

// CreateRelease adds a new Release row to the Releases table in the database
func (repo *ReleaseRepository) CreateRelease(release *models.Release) (*models.Release, error) {
	if err := repo.db.Create(release).Error; err != nil {
		return nil, err
	}
	return release, nil
}

// ReadRelease finds a single release based on their unique name and namespace pair.
func (repo *ReleaseRepository) ReadRelease(clusterID uint, name, namespace string) (*models.Release, error) {
	release := &models.Release{}
	if err := repo.db.Preload("GitActionConfig").Preload("Tags").Order("id desc").Where("cluster_id = ? AND name = ? AND namespace = ?", clusterID, name, namespace).First(&release).Error; err != nil {
		return nil, err
	}
	return release, nil
}

// ReadRelease finds a single release based on their unique name and namespace pair.
func (repo *ReleaseRepository) ListReleasesByImageRepoURI(clusterID uint, imageRepoURI string) ([]*models.Release, error) {
	releases := make([]*models.Release, 0)

	if imageRepoURI == "" {
		return releases, nil
	}

	if err := repo.db.Preload("GitActionConfig").Preload("Tags").Where("cluster_id = ?", clusterID).Where("image_repo_uri = ?", imageRepoURI).Find(&releases).Error; err != nil {
		return nil, err
	}

	return releases, nil
}

// ReadReleaseByWebhookToken finds a single release based on their unique webhook token.
func (repo *ReleaseRepository) ReadReleaseByWebhookToken(token string) (*models.Release, error) {
	release := &models.Release{}
	if err := repo.db.Preload("GitActionConfig").Preload("Tags").Where("webhook_token = ?", token).First(&release).Error; err != nil {
		return nil, err
	}
	return release, nil
}

// UpdateRelease modifies an existing Release in the database
func (repo *ReleaseRepository) UpdateRelease(release *models.Release) (*models.Release, error) {
	if err := repo.db.Save(release).Error; err != nil {
		return nil, err
	}

	return release, nil
}

// DeleteRelease deletes a single user using their unique name and namespace pair
func (repo *ReleaseRepository) DeleteRelease(release *models.Release) (*models.Release, error) {
	if err := repo.db.Delete(&release).Error; err != nil {
		return nil, err
	}
	return release, nil
}
