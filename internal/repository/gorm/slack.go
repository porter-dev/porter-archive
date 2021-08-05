package gorm

import (
	"github.com/porter-dev/porter/internal/repository"
	"gorm.io/gorm"

	ints "github.com/porter-dev/porter/internal/models/integrations"
)

// SlackIntegrationRepository uses gorm.DB for querying the database
type SlackIntegrationRepository struct {
	db  *gorm.DB
	key *[32]byte
}

// NewSlackIntegrationRepository returns a SlackIntegrationRepository which uses
// gorm.DB for querying the database. It accepts an encryption key to encrypt
// sensitive data
func NewSlackIntegrationRepository(
	db *gorm.DB,
	key *[32]byte,
) repository.SlackIntegrationRepository {
	return &SlackIntegrationRepository{db, key}
}

// CreateSlackIntegration creates a new kube auth mechanism
func (repo *SlackIntegrationRepository) CreateSlackIntegration(
	slackInt *ints.SlackIntegration,
) (*ints.SlackIntegration, error) {
	err := repo.EncryptSlackIntegrationData(slackInt, repo.key)

	if err != nil {
		return nil, err
	}

	if err := repo.db.Create(slackInt).Error; err != nil {
		return nil, err
	}

	return slackInt, nil
}

// ListSlackIntegrationsByProjectID finds all kube auth mechanisms
// for a given project id
func (repo *SlackIntegrationRepository) ListSlackIntegrationsByProjectID(
	projectID uint,
) ([]*ints.SlackIntegration, error) {
	slackInts := []*ints.SlackIntegration{}

	if err := repo.db.Where("project_id = ?", projectID).Find(&slackInts).Error; err != nil {
		return nil, err
	}

	for _, slackInt := range slackInts {
		repo.DecryptSlackIntegrationData(slackInt, repo.key)
	}

	return slackInts, nil
}

// DeleteSlackIntegration deletes a slack integration by ID
func (repo *SlackIntegrationRepository) DeleteSlackIntegration(
	integrationID uint,
) error {
	if err := repo.db.Where("id = ?", integrationID).Delete(&ints.SlackIntegration{}).Error; err != nil {
		return err
	}

	return nil
}

// EncryptSlackIntegrationData will encrypt the slack integration data before
// writing to the DB
func (repo *SlackIntegrationRepository) EncryptSlackIntegrationData(
	slackInt *ints.SlackIntegration,
	key *[32]byte,
) error {
	if len(slackInt.ClientID) > 0 {
		cipherData, err := repository.Encrypt(slackInt.ClientID, key)

		if err != nil {
			return err
		}

		slackInt.ClientID = cipherData
	}

	if len(slackInt.AccessToken) > 0 {
		cipherData, err := repository.Encrypt(slackInt.AccessToken, key)

		if err != nil {
			return err
		}

		slackInt.AccessToken = cipherData
	}

	if len(slackInt.RefreshToken) > 0 {
		cipherData, err := repository.Encrypt(slackInt.RefreshToken, key)

		if err != nil {
			return err
		}

		slackInt.RefreshToken = cipherData
	}

	if len(slackInt.Webhook) > 0 {
		cipherData, err := repository.Encrypt(slackInt.Webhook, key)

		if err != nil {
			return err
		}

		slackInt.Webhook = cipherData
	}

	return nil
}

// DecryptSlackIntegrationData will decrypt the slack integration data before
// returning it from the DB
func (repo *SlackIntegrationRepository) DecryptSlackIntegrationData(
	slackInt *ints.SlackIntegration,
	key *[32]byte,
) error {
	if len(slackInt.ClientID) > 0 {
		plaintext, err := repository.Decrypt(slackInt.ClientID, key)

		if err != nil {
			return err
		}

		slackInt.ClientID = plaintext
	}

	if len(slackInt.AccessToken) > 0 {
		plaintext, err := repository.Decrypt(slackInt.AccessToken, key)

		if err != nil {
			return err
		}

		slackInt.AccessToken = plaintext
	}

	if len(slackInt.RefreshToken) > 0 {
		plaintext, err := repository.Decrypt(slackInt.RefreshToken, key)

		if err != nil {
			return err
		}

		slackInt.RefreshToken = plaintext
	}

	if len(slackInt.Webhook) > 0 {
		plaintext, err := repository.Decrypt(slackInt.Webhook, key)

		if err != nil {
			return err
		}

		slackInt.Webhook = plaintext
	}

	return nil
}
