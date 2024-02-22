package test

import (
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
)

type APITokenRepository struct {
	canQuery bool
}

func NewAPITokenRepository(canQuery bool) repository.APITokenRepository {
	return &APITokenRepository{canQuery}
}

func (repo *APITokenRepository) CreateAPIToken(a *models.APIToken) (*models.APIToken, error) {
	panic("unimplemented")
}

func (repo *APITokenRepository) ListAPITokensByProjectID(projectID uint) ([]*models.APIToken, error) {
	panic("unimplemented")
}

func (repo *APITokenRepository) ReadAPIToken(projectID uint, uid string) (*models.APIToken, error) {
	panic("unimplemented")
}

func (repo *APITokenRepository) UpdateAPIToken(
	token *models.APIToken,
) (*models.APIToken, error) {
	panic("unimplemented")
}
