// +build ee

package gorm

import (
	"github.com/porter-dev/porter/ee/models"
	"github.com/porter-dev/porter/ee/repository"
	cerepository "github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// UserBillingRepository uses gorm.DB for querying the database
type UserBillingRepository struct {
	db  *gorm.DB
	key *[32]byte
}

func NewUserBillingRepository(db *gorm.DB, key *[32]byte) repository.UserBillingRepository {
	return &UserBillingRepository{db, key}
}

// CreateUserBilling adds a new User row to the Users table in the database
func (repo *UserBillingRepository) CreateUserBilling(userBilling *models.UserBilling) (*models.UserBilling, error) {
	err := repo.EncryptUserBillingData(userBilling, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Create(userBilling).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptUserBillingData(userBilling, repo.key)

	if err != nil {
		return nil, err
	}

	return userBilling, nil
}

func (repo *UserBillingRepository) ReadUserBilling(projectID, userID uint) (*models.UserBilling, error) {
	userBilling := &models.UserBilling{}

	if err := repo.db.Where("project_id = ? AND user_id = ?", projectID, userID).First(&userBilling).Error; err != nil {
		return nil, err
	}

	err := repo.DecryptUserBillingData(userBilling, repo.key)

	if err != nil {
		return nil, err
	}

	return userBilling, nil
}

// UpdateUserBilling updates user billing in the db
func (repo *UserBillingRepository) UpdateUserBilling(userBilling *models.UserBilling) (*models.UserBilling, error) {
	err := repo.EncryptUserBillingData(userBilling, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Save(userBilling).Error; err != nil {
		return nil, err
	}

	err = repo.DecryptUserBillingData(userBilling, repo.key)

	if err != nil {
		return nil, err
	}

	return userBilling, nil
}

// EncryptUserBillingData will encrypt the user's billing data before writing
// to the DB
func (repo *UserBillingRepository) EncryptUserBillingData(
	userBilling *models.UserBilling,
	key *[32]byte,
) error {
	if tok := userBilling.Token; len(tok) > 0 {
		cipherData, err := cerepository.Encrypt(tok, key)

		if err != nil {
			return err
		}

		userBilling.Token = cipherData
	}

	return nil
}

// DecryptUserBillingData will decrypt the user's billing data before returning it
// from the DB
func (repo *UserBillingRepository) DecryptUserBillingData(
	userBilling *models.UserBilling,
	key *[32]byte,
) error {
	if tok := userBilling.Token; len(tok) > 0 {
		plaintext, err := cerepository.Decrypt(tok, key)

		if err != nil {
			return err
		}

		userBilling.Token = plaintext
	}

	return nil
}
