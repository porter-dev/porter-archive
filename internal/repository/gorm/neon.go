package gorm

import (
	"context"

	"github.com/porter-dev/porter/internal/encryption"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
	"gorm.io/gorm"
)

// NeonIntegrationRepository is a repository that manages neon integrations
type NeonIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewNeonIntegrationRepository returns a NeonIntegrationRepository
func NewNeonIntegrationRepository(db *gorm.DB, key *[32]byte) repository.NeonIntegrationRepository {
	return &NeonIntegrationRepository{db, key}
}

// Insert creates a new neon integration
func (repo *NeonIntegrationRepository) Insert(
	ctx context.Context, neonInt ints.NeonIntegration,
) (ints.NeonIntegration, error) {
	ctx, span := telemetry.NewSpan(ctx, "gorm-create-neon-integration")
	defer span.End()

	var created ints.NeonIntegration

	encrypted, err := repo.EncryptNeonIntegration(neonInt, repo.key)
	if err != nil {
		return created, telemetry.Error(ctx, span, err, "failed to encrypt")
	}

	if err := repo.db.Create(&encrypted).Error; err != nil {
		return created, telemetry.Error(ctx, span, err, "failed to create neon integration")
	}

	return created, nil
}

// EncryptNeonIntegration will encrypt the neon integration data before
// writing to the DB
func (repo *NeonIntegrationRepository) EncryptNeonIntegration(
	neonInt ints.NeonIntegration,
	key *[32]byte,
) (ints.NeonIntegration, error) {
	encrypted := neonInt

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

	return encrypted, nil
}
