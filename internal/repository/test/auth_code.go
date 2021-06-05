package test

import (
	"errors"

	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"
)

// AuthCodeRepository uses gorm.DB for querying the database
type AuthCodeRepository struct {
	canQuery  bool
	authCodes []*models.AuthCode
}

// NewAuthCodeRepository returns a AuthCodeRepository which uses
// gorm.DB for querying the database
func NewAuthCodeRepository(canQuery bool) repository.AuthCodeRepository {
	return &AuthCodeRepository{canQuery, []*models.AuthCode{}}
}

// CreateAuthCode creates a new invite
func (repo *AuthCodeRepository) CreateAuthCode(a *models.AuthCode) (*models.AuthCode, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot write database")
	}

	repo.authCodes = append(repo.authCodes, a)
	a.ID = uint(len(repo.authCodes))

	return a, nil
}

// ReadAuthCode gets an auth code object specified by the unique code
func (repo *AuthCodeRepository) ReadAuthCode(code string) (*models.AuthCode, error) {
	if !repo.canQuery {
		return nil, errors.New("Cannot read from database")
	}

	var res *models.AuthCode

	for _, a := range repo.authCodes {
		if code == a.AuthorizationCode {
			res = a
		}
	}

	if res == nil {
		return nil, gorm.ErrRecordNotFound
	}

	return res, nil
}
