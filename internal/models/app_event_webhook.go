package models

import (
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx/types"
	"gorm.io/gorm"
)

type AppEventWebhooks struct {
	gorm.Model

	// ID is a unqiue identifier of an AppEventWebhook entry
	ID        uuid.UUID    `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt sql.NullTime `db:"created_at"`
	UpdatedAt sql.NullTime `db:"updated_at"`
	DeletedAt sql.NullTime `db:"deleted_at"`

	// AppInstanceID uniquely identifies the application this webhook URL is configured for
	AppInstanceID uuid.UUID `db:"app_instance_id"`

	// webhooksJSON is a json text holding webhook configuration for an app
	WebhooksJSON types.JSONText `db:"webhooks_json"`
}

// TableName overrides the table name
func (AppEventWebhooks) TableName() string {
	return "app_event_webhooks"
}
