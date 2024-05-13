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

// Integrations returns all upstash integrations for a given project
func (repo *UpstashIntegrationRepository) Integrations(
	ctx context.Context, projectID uint,
) ([]ints.UpstashIntegration, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-list-upstash-integrations")
	defer span.End()

	var integrations []ints.UpstashIntegration

	if err := repo.db.Where("project_id = ?", projectID).Find(&integrations).Error; err != nil {
		return integrations, telemetry.Error(ctx, span, err, "failed to list upstash integrations")
	}

	for i, integration := range integrations {
		decrypted, err := repo.DecryptUpstashIntegration(integration, repo.key)
		if err != nil {
			return integrations, telemetry.Error(ctx, span, err, "failed to decrypt")
		}

		integrations[i] = decrypted
	}

	return integrations, nil
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

// DecryptUpstashIntegration will decrypt the upstash integration data before
// returning it from the DB
func (repo *UpstashIntegrationRepository) DecryptUpstashIntegration(
	upstashInt ints.UpstashIntegration,
	key *[32]byte,
) (ints.UpstashIntegration, error) {
	decrypted := upstashInt

	if len(decrypted.ClientID) > 0 {
		plaintext, err := encryption.Decrypt(decrypted.ClientID, key)
		if err != nil {
			return decrypted, err
		}

		decrypted.ClientID = plaintext
	}

	if len(decrypted.AccessToken) > 0 {
		plaintext, err := encryption.Decrypt(decrypted.AccessToken, key)
		if err != nil {
			return decrypted, err
		}

		decrypted.AccessToken = plaintext
	}

	if len(decrypted.RefreshToken) > 0 {
		plaintext, err := encryption.Decrypt(decrypted.RefreshToken, key)
		if err != nil {
			return decrypted, err
		}

		decrypted.RefreshToken = plaintext
	}

	if len(decrypted.DeveloperApiKey) > 0 {
		plaintext, err := encryption.Decrypt(decrypted.DeveloperApiKey, key)
		if err != nil {
			return decrypted, err
		}

		decrypted.DeveloperApiKey = plaintext
	}

	return decrypted, nil
}
