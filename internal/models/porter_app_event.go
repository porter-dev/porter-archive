package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// PorterAppEvent represents an event that occurs on a Porter stack during a stacks lifecycle.
type PorterAppEvent struct {
	gorm.Model

	// ID is a unique identifier for a given event
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	// Status contains the accepted status' of a given event such as SUCCESS, FAILED, PROGRESSING, etc.
	Status string `json:"status"`
	// Type represents a supported Porter Stack Event
	Type string `json:"type"`
	// TypeExternalSource represents an external event source such as Github, or Gitlab. This is not always required but will commonly be see in build events
	TypeExternalSource string `json:"type_source,omitempty"`
	// CreatedAt is the time (UTC) that a given event was created. This should not change
	CreatedAt time.Time `json:"created_at"`
	// UpdatedAt is the time (UTC) that an event was last updated. This can occur when an event was created as PROGRESSING, then was marked as SUCCESSFUL for example
	UpdatedAt time.Time `json:"updated_at"`
	// PorterAppID is the ID that the given event relates to
	PorterAppID string `json:"porter_app_id"`
	Metadata    JSONB  `json:"metadata" sql:"type:jsonb" gorm:"type:jsonb"`
}

// TableName overrides the table name
func (PorterAppEvent) TableName() string {
	return "porter_app_events"
}

func (p *PorterAppEvent) ToPorterAppEvent() types.PorterAppEvent {
	if p == nil {
		return types.PorterAppEvent{}
	}
	ty := types.PorterAppEvent{
		ID:                 p.ID.String(),
		Status:             p.Status,
		Type:               types.PorterAppEventType(p.Type),
		TypeExternalSource: p.TypeExternalSource,
		CreatedAt:          p.CreatedAt,
		UpdatedAt:          p.UpdatedAt,
		PorterAppID:        p.PorterAppID,
		Metadata:           p.Metadata,
	}
	return ty
}
