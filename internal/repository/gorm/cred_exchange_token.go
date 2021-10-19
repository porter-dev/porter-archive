package gorm

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// CredentialsExchangeTokenRepository uses gorm.DB for querying the database
type CredentialsExchangeTokenRepository struct {
	db *gorm.DB
}

func NewCredentialsExchangeTokenRepository(db *gorm.DB) repository.CredentialsExchangeTokenRepository {
	return &CredentialsExchangeTokenRepository{db}
}

func (repo *CredentialsExchangeTokenRepository) CreateCredentialsExchangeToken(ceToken *models.CredentialsExchangeToken) (*models.CredentialsExchangeToken, error) {
	if err := repo.db.Create(ceToken).Error; err != nil {
		return nil, err
	}

	return ceToken, nil
}

func (repo *CredentialsExchangeTokenRepository) ReadCredentialsExchangeToken(id uint) (*models.CredentialsExchangeToken, error) {
	ceToken := &models.CredentialsExchangeToken{}

	if err := repo.db.Where("id = ?", id).First(&ceToken).Error; err != nil {
		return nil, err
	}

	return ceToken, nil
}
