package models

import "gorm.io/gorm"

type EventStatus int64

const (
	EventStatusSuccess    EventStatus = 1
	EventStatusInProgress             = 2
	EventStatusFailed                 = 3
)

type EventContainer struct {
	gorm.Model
	ReleaseID uint
	Steps     []SubEvent
}

type SubEvent struct {
	gorm.Model

	EventContainerID uint

	EventID string // events with the same id wil be treated the same, and the highest index one is retained
	Name    string
	Index   int64 // priority of the event, used for sorting
	Status  EventStatus
	Info    string
}
