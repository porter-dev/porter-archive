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

	OwnerType string `json:"owner_type"`
	OwnerName string `json:"owner_name"`

	EventType    string    `json:"event_type"`
	RefType      string    `json:"resource_type"`
	RefName      string    `json:"name"`
	RefNamespace string    `json:"namespace"`
	Message      string    `json:"message"`
	Reason       string    `json:"reason"`
	Data         []byte    `json:"data"`
	Timestamp    time.Time `json:"timestamp"`
}

type EventExternalSimple struct {
	ID uint `json:"id"`

	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	OwnerType string `json:"owner_type"`
	OwnerName string `json:"owner_name"`

	EventType    string    `json:"event_type"`
	RefType      string    `json:"resource_type"`
	RefName      string    `json:"name"`
	RefNamespace string    `json:"namespace"`
	Message      string    `json:"message"`
	Reason       string    `json:"reason"`
	Timestamp    time.Time `json:"timestamp"`
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

// Externalize generates an external Event to be shared over REST
func (e *Event) ExternalizeSimple() *EventExternalSimple {
	return &EventExternalSimple{
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
	}
}
