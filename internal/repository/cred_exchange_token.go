package repository

import "github.com/porter-dev/porter/internal/models"

type CredentialsExchangeTokenRepository interface {
	CreateCredentialsExchangeToken(ceToken *models.CredentialsExchangeToken) (*models.CredentialsExchangeToken, error)
	ReadCredentialsExchangeToken(id uint) (*models.CredentialsExchangeToken, error)
}
