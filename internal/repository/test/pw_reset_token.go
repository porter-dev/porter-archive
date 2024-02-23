package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// PWResetTokenRepository uses gorm.DB for querying the database
type PWResetTokenRepository struct {
	canQuery      bool
	pwResetTokens []*models.PWResetToken
}

// NewPWResetTokenRepository returns a PWResetTokenRepository which uses
// gorm.DB for querying the database
func NewPWResetTokenRepository(canQuery bool) repository.PWResetTokenRepository {
	return &PWResetTokenRepository{canQuery, []*models.PWResetToken{}}
}

// CreatePWResetToken creates a new invite
func (repo *PWResetTokenRepository) CreatePWResetToken(a *models.PWResetToken) (*models.PWResetToken, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.pwResetTokens = append(repo.pwResetTokens, a)
	a.ID = uint(len(repo.pwResetTokens))

	return a, nil
}

// ReadPWResetToken gets an auth code object specified by the unique code
func (repo *PWResetTokenRepository) ReadPWResetToken(id uint) (*models.PWResetToken, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	if int(id-1) >= len(repo.pwResetTokens) || repo.pwResetTokens[id-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(id - 1)
	return repo.pwResetTokens[index], nil
}

// UpdatePWResetToken modifies an existing PWResetToken in the database
func (repo *PWResetTokenRepository) UpdatePWResetToken(
	pwToken *models.PWResetToken,
) (*models.PWResetToken, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	if int(pwToken.ID-1) >= len(repo.pwResetTokens) || repo.pwResetTokens[pwToken.ID-1] == nil {
		return nil, gorm.ErrRecordNotFound
	}

	index := int(pwToken.ID - 1)
	repo.pwResetTokens[index] = pwToken

	return pwToken, nil
}
