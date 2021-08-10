package models

import (
	"time"

	"gorm.io/gorm"
)

// Event model that refers to a type of event from a Kubernetes cluster
type Event struct {
	gorm.Model

	ProjectID uint
	ClusterID uint

	OwnerType string
	OwnerName string

	EventType    string
	RefType      string
	RefName      string
	RefNamespace string
	Message      string
	Reason       string
	Data         []byte

	Timestamp time.Time
	Expiry    time.Time
}

// EventExternal is an event to be shared over REST
type EventExternal struct {
	ID uint `json:"id"`

	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	OwnerType string `json:"owner_name"`
	OwnerName string `json:"owner_type"`

	EventType    string `json:"event_type"`
	RefType      string `json:"ref_type"`
	RefName      string `json:"ref_name"`
	RefNamespace string `json:"ref_namespace"`
	Message      string `json:"message"`
	Reason       string `json:"reason"`
	Timestamp    time.Time
	Data         []byte `json:"data"`
}

// Externalize generates an external Event to be shared over REST
func (e *Event) Externalize() *EventExternal {
	return &EventExternal{
		ID:           e.ID,
		ProjectID:    e.ProjectID,
		ClusterID:    e.ClusterID,
		OwnerName:    e.OwnerName,
		OwnerType:    e.OwnerType,
		EventType:    e.EventType,
		RefType:      e.RefType,
		RefName:      e.RefName,
		RefNamespace: e.RefNamespace,
		Reason:       e.Reason,
		Timestamp:    e.Timestamp,
		Data:         e.Data,
	}
}
