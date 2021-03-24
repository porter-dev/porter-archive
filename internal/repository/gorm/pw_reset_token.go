package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PWResetTokenRepository uses gorm.DB for querying the database
type PWResetTokenRepository struct {
	db *gorm.DB
}

// NewPWResetTokenRepository returns a PWResetTokenRepository which uses
// gorm.DB for querying the database
func NewPWResetTokenRepository(db *gorm.DB) repository.PWResetTokenRepository {
	return &PWResetTokenRepository{db}
}

// CreatePWResetToken creates a new auth code
func (repo *PWResetTokenRepository) CreatePWResetToken(a *models.PWResetToken) (*models.PWResetToken, error) {
	if err := repo.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}

// ReadPWResetToken gets an invite specified by a unique token
func (repo *PWResetTokenRepository) ReadPWResetToken(id uint) (*models.PWResetToken, error) {

	pwReset := &models.PWResetToken{}

	if err := repo.db.Where("id = ?", id).First(&pwReset).Error; err != nil {
		return nil, err
	}

	return pwReset, nil
}

// UpdatePWResetToken modifies an existing PWResetToken in the database
func (repo *PWResetTokenRepository) UpdatePWResetToken(
	pwToken *models.PWResetToken,
) (*models.PWResetToken, error) {
	if err := repo.db.Save(pwToken).Error; err != nil {
		return nil, err
	}

	return pwToken, nil
}
