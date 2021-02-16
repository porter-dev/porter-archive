package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AuthCodeRepository uses gorm.DB for querying the database
type AuthCodeRepository struct {
	db *gorm.DB
}

// NewAuthCodeRepository returns a AuthCodeRepository which uses
// gorm.DB for querying the database
func NewAuthCodeRepository(db *gorm.DB) repository.AuthCodeRepository {
	return &AuthCodeRepository{db}
}

// CreateAuthCode creates a new auth code
func (repo *AuthCodeRepository) CreateAuthCode(a *models.AuthCode) (*models.AuthCode, error) {
	if err := repo.db.Create(a).Error; err != nil {
		return nil, err
	}
	return a, nil
}

// ReadAuthCode gets an invite specified by a unique token
func (repo *AuthCodeRepository) ReadAuthCode(code string) (*models.AuthCode, error) {
	a := &models.AuthCode{}

	if err := repo.db.Where("authorization_code = ?", code).First(&a).Error; err != nil {
		return nil, err
	}

	return a, nil
}
