package models

import (
	"gorm.io/gorm"
	"time"
)

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

type SubEventExternal struct {
	EventID string      `json:"event_id"`
	Name    string      `json:"name"`
	Index   int64       `json:"index"`
	Status  EventStatus `json:"status"`
	Info    string      `json:"info"`
	Time    time.Time   `json:"time""`
}

func (event *SubEvent) Externalize() SubEventExternal {
	return SubEventExternal{
		EventID: event.EventID,
		Name:    event.Name,
		Index:   event.Index,
		Status:  event.Status,
		Info:    event.Info,
		Time:    event.UpdatedAt,
	}
}
