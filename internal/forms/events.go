package forms

import (
	"strings"
	"time"

	"github.com/porter-dev/porter/internal/models"
)

// CreateEventForm is the input for creating a new event
type CreateEventForm struct {
	ResourceType string    `json:"resource_type"`
	Name         string    `json:"name"`
	OwnerType    string    `json:"owner_type"`
	OwnerName    string    `json:"owner_name"`
	EventType    string    `json:"event_type"`
	Namespace    string    `json:"namespace"`
	Message      string    `json:"message"`
	Reason       string    `json:"reason"`
	Timestamp    time.Time `json:"timestamp"`
	Data         []string  `json:"data"`
}

func (c *CreateEventForm) ToEvent(projID uint, clusterID uint) *models.Event {
	return &models.Event{
		ProjectID:    projID,
		ClusterID:    clusterID,
		OwnerType:    c.OwnerType,
		OwnerName:    c.OwnerName,
		EventType:    c.EventType,
		RefType:      c.ResourceType,
		RefName:      c.Name,
		RefNamespace: c.Namespace,
		Message:      c.Message,
		Reason:       c.Reason,
		Timestamp:    c.Timestamp,
		Data:         []byte(strings.Join(c.Data, "\n")),
		Expiry:       time.Now().Add(24 * 14 * time.Hour),
	}
}
