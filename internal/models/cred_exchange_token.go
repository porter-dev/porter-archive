package models

import (
	"time"

	"gorm.io/gorm"
)

type CredentialsExchangeToken struct {
	gorm.Model

	ProjectID uint
	Token     []byte
	Expiry    *time.Time

	DOCredentialID    uint
	AWSCredentialID   uint
	GCPCredentialID   uint
	AzureCredentialID uint
}

func (t *CredentialsExchangeToken) IsExpired() bool {
	timeLeft := t.Expiry.Sub(time.Now())
	return timeLeft < 0
}
