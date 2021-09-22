package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// InfraRepository uses gorm.DB for querying the database
type InfraRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewInfraRepository returns a InfraRepository which uses
// gorm.DB for querying the database
func NewInfraRepository(db *gorm.DB, key *[32]byte) repository.InfraRepository {
	return &InfraRepository{db, key}
}

// CreateInfra creates a new aws infra
func (repo *InfraRepository) CreateInfra(infra *models.Infra) (*models.Infra, error) {
	err := repo.EncryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	project := &models.Project{}

	if err := repo.db.Where("id = ?", infra.ProjectID).First(&project).Error; err != nil {
		return nil, err
	}

	assoc := repo.db.Model(&project).Association("Infras")

	if assoc.Error != nil {
		return nil, assoc.Error
	}

	if err := assoc.Append(infra); err != nil {
		return nil, err
	}

	err = repo.DecryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	return infra, nil
}

// ReadInfra gets a aws infra specified by a unique id
func (repo *InfraRepository) ReadInfra(projectID, infraID uint) (*models.Infra, error) {
	infra := &models.Infra{}

	if err := repo.db.Where("project_id = ? AND id = ?", projectID, infraID).First(&infra).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptInfraData(infra, repo.key)

	if err != nil {
		return nil, err
	}

	return infra, nil
}

// ListInfrasByProjectID finds all aws infras
// for a given project id
func (repo *InfraRepository) ListInfrasByProjectID(
	projectID uint,
) ([]*models.Infra, error) {
	infras := []*models.Infra{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&infras).Error; err != nil {
		return nil, err
	}

	for _, infra := range infras {
		repo.DecryptInfraData(infra, repo.key)
	}

	return infras, nil
}

// UpdateInfra modifies an existing Infra in the database
func (repo *InfraRepository) UpdateInfra(
	ai *models.Infra,
) (*models.Infra, error) {
	err := repo.EncryptInfraData(ai, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(ai).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptInfraData(ai, repo.key)

	if err != nil {
		return nil, err
	}

	return ai, nil
}

// EncryptInfraData will encrypt the infra data before
// writing to the DB
func (repo *InfraRepository) EncryptInfraData(
	infra *models.Infra,
	key *[32]byte,
) error {
	if len(infra.LastApplied) > 0 {
		cipherData, err := repository.Encrypt(infra.LastApplied, key)

		if err != nil {
			return err
		}

		infra.LastApplied = cipherData
	}

	return nil
}

// DecryptInfraData will decrypt the user's infra data before
// returning it from the DB
func (repo *InfraRepository) DecryptInfraData(
	infra *models.Infra,
	key *[32]byte,
) error {
	if len(infra.LastApplied) > 0 {
		plaintext, err := repository.Decrypt(infra.LastApplied, key)

		if err != nil {
			return err
		}

		infra.LastApplied = plaintext
	}

	return nil
}
