package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AppEventWebhook struct {
	gorm.Model

	// ID is a unqiue identifier of an AppEventWebhook entry
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	// CreatedAt is the time (UTC) a given AppEventWebhook was created at
	CreatedAt time.Time
	// UpdatedAt is the time (UTC) a given AppEventWebhook was last updated
	UpdatedAt time.Time

	// WebhookURL is the URL of the webhook
	// this is stored in the database encrypted
	WebhookURL []byte `db:"webhook_url"`

	// PayloadEncryptionKey is the key used to encrypt the payload to the webhook
	// this is stored in the database encrypted
	PayloadEncryptionKey []byte `db:"payload_encryption_key"`

	// AppEventType is the type of the event this webhook is configured for
	AppEventType string
	// AppEventStatus is the status of the event this webhook is configured for
	AppEventStatus string
	// Metadata contains all other additional configruation
	Metadata JSONB
}
