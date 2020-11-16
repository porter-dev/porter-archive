package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// RepoClientRepository uses gorm.DB for querying the database
type RepoClientRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewRepoClientRepository returns a RepoClientRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewRepoClientRepository(db *gorm.DB, key *[32]byte) repository.RepoClientRepository {
	return &RepoClientRepository{db, key}
}

// CreateRepoClient creates a new repo client and appends it to the in-memory list
func (repo *RepoClientRepository) CreateRepoClient(rc *models.RepoClient) (*models.RepoClient, error) {
	err := repo.EncryptRepoClientData(rc, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", rc.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("RepoClients")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(rc); err != nil {
		return nil, err
	}

	return rc, nil
}

// ReadRepoClient returns a repo client by id
func (repo *RepoClientRepository) ReadRepoClient(id uint) (*models.RepoClient, error) {
	rc := &models.RepoClient{}

	// preload Clusters association
	if err := repo.db.Where("id = ?", id).First(&rc).Error; err != nil {
		return nil, err
	}

	repo.DecryptRepoClientData(rc, repo.key)

	return rc, nil
}

// ListRepoClientsByProjectID returns a list of repo clients that match a project id
func (repo *RepoClientRepository) ListRepoClientsByProjectID(projectID uint) ([]*models.RepoClient, error) {
	rcs := []*models.RepoClient{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&rcs).Error; err != nil {
		return nil, err
	}

	for _, rc := range rcs {
		repo.DecryptRepoClientData(rc, repo.key)
	}

	return rcs, nil
}

// EncryptRepoClientData will encrypt the repo client tokens before writing
// to the DB
func (repo *RepoClientRepository) EncryptRepoClientData(
	rc *models.RepoClient,
	key *[32]byte,
) error {
	if len(rc.AccessToken) > 0 {
		cipherData, err := repository.Encrypt(rc.AccessToken, key)

		if err != nil {
			return err
		}

		rc.AccessToken = cipherData
	}

	if len(rc.RefreshToken) > 0 {
		cipherData, err := repository.Encrypt(rc.RefreshToken, key)

		if err != nil {
			return err
		}

		rc.RefreshToken = cipherData
	}

	return nil
}

// DecryptRepoClientData will decrypt the repo client tokens before
// returning it from the DB
func (repo *RepoClientRepository) DecryptRepoClientData(
	rc *models.RepoClient,
	key *[32]byte,
) error {
	if len(rc.AccessToken) > 0 {
		plaintext, err := repository.Decrypt(rc.AccessToken, key)

		if err != nil {
			return err
		}

		rc.AccessToken = plaintext
	}

	if len(rc.RefreshToken) > 0 {
		plaintext, err := repository.Decrypt(rc.RefreshToken, key)

		if err != nil {
			return err
		}

		rc.RefreshToken = plaintext
	}

	return nil
}
