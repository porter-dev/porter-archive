package repository

import (
	"github.com/porter-dev/porter/internal/models"
)

// APITokenRepository represents the set of queries on the APIToken model
type APITokenRepository interface {
	CreateAPIToken(token *models.APIToken) (*models.APIToken, error)
	ListAPITokensByProjectID(projectID uint) ([]*models.APIToken, error)
	ReadAPIToken(projectID uint, uid string) (*models.APIToken, error)
	UpdateAPIToken(token *models.APIToken) (*models.APIToken, error)
}
