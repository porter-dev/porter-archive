package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/encryption"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

// UpstashIntegrationRepository is a repository that manages upstash integrations
type UpstashIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewUpstashIntegrationRepository returns a UpstashIntegrationRepository
func NewUpstashIntegrationRepository(db *gorm.DB, key *[32]byte) repository.UpstashIntegrationRepository {
	return &UpstashIntegrationRepository{db, key}
}

// Insert creates a new upstash integration
func (repo *UpstashIntegrationRepository) Insert(
	ctx context.Context, upstashInt ints.UpstashIntegration,
) (ints.UpstashIntegration, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-create-upstash-integration")
	defer span.End()

	var created ints.UpstashIntegration

	encrypted, err := repo.EncryptUpstashIntegration(upstashInt, repo.key)
	if err != nil {
		return created, telemetry.Error(ctx, span, err, "failed to encrypt")
	}

	if err := repo.db.Create(&encrypted).Error; err != nil {
		return created, telemetry.Error(ctx, span, err, "failed to create upstash integration")
	}

	return created, nil
}

// EncryptUpstashIntegration will encrypt the upstash integration data before
// writing to the DB
func (repo *UpstashIntegrationRepository) EncryptUpstashIntegration(
	upstashInt ints.UpstashIntegration,
	key *[32]byte,
) (ints.UpstashIntegration, error) {
	encrypted := upstashInt

	if len(encrypted.ClientID) > 0 {
		cipherData, err := encryption.Encrypt(encrypted.ClientID, key)
		if err != nil {
			return encrypted, err
		}

		encrypted.ClientID = cipherData
	}

	if len(encrypted.AccessToken) > 0 {
		cipherData, err := encryption.Encrypt(encrypted.AccessToken, key)
		if err != nil {
			return encrypted, err
		}

		encrypted.AccessToken = cipherData
	}

	if len(encrypted.RefreshToken) > 0 {
		cipherData, err := encryption.Encrypt(encrypted.RefreshToken, key)
		if err != nil {
			return encrypted, err
		}

		encrypted.RefreshToken = cipherData
	}

	if len(encrypted.DeveloperApiKey) > 0 {
		cipherData, err := encryption.Encrypt(encrypted.DeveloperApiKey, key)
		if err != nil {
			return encrypted, err
		}

		encrypted.DeveloperApiKey = cipherData
	}

	return encrypted, nil
}
