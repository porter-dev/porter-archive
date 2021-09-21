package models

import (
	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
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
	Status  types.EventStatus
	Info    string
}

func (event *SubEvent) ToSubEventType() types.SubEvent {
	return types.SubEvent{
		EventID: event.EventID,
		Name:    event.Name,
		Index:   event.Index,
		Status:  event.Status,
		Info:    event.Info,
		Time:    event.UpdatedAt.Unix(),
	}
}
