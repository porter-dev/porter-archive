package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

type CredentialsExchangeTokenRepository struct {
	canQuery bool
	ceTokens []*models.CredentialsExchangeToken
}

func NewCredentialsExchangeTokenRepository(canQuery bool) repository.CredentialsExchangeTokenRepository {
	return &CredentialsExchangeTokenRepository{canQuery, []*models.CredentialsExchangeToken{}}
}

func (repo *CredentialsExchangeTokenRepository) CreateCredentialsExchangeToken(
	a *models.CredentialsExchangeToken,
) (*models.CredentialsExchangeToken, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.ceTokens = append(repo.ceTokens, a)
	a.ID = uint(len(repo.ceTokens))

	return a, nil
}

// ReadPWResetToken gets an auth code object specified by the unique code
func (repo *CredentialsExchangeTokenRepository) ReadCredentialsExchangeToken(id uint) (*models.CredentialsExchangeToken, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.ceTokens) || repo.ceTokens[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.ceTokens[index], nil
}
