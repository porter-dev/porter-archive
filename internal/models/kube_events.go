package models

import (
	"time"

	"github.com/porter-dev/porter/api/types"
	"gorm.io/gorm"
)

// KubeEvent model refers to a type of event from a Kubernetes cluster
type KubeEvent struct {
	gorm.Model

	ProjectID uint
	ClusterID uint

	// The name of the referenced kube object
	Name string

	// The kube resource type, such as "pod", "hpa", or "node"
	ResourceType string

	// (optional) The owner reference type and name, which can be used to filter events by
	// controller
	OwnerType string
	OwnerName string

	// (optional) the namespace of the event, if namespaceable
	Namespace string

	// The "subevents" attached to the event. These are a grouped collection of events that belong
	// to the same object.
	SubEvents []KubeSubEvent
}

type KubeSubEvent struct {
	gorm.Model

	KubeEventID uint
	Message     string
	Reason      string
	Timestamp   time.Time

	// The event type, such as "critical" or "normal"
	EventType types.KubeEventType
}

func (k *KubeSubEvent) ToKubeSubEventType() *types.KubeSubEvent {
	return &types.KubeSubEvent{
		Message:   k.Message,
		Reason:    k.Reason,
		Timestamp: k.Timestamp,
		EventType: k.EventType,
	}
}

func (k *KubeEvent) ToKubeEventType() *types.KubeEvent {
	subEvents := make([]*types.KubeSubEvent, 0)

	for _, subEvent := range k.SubEvents {
		subEvents = append(subEvents, subEvent.ToKubeSubEventType())
	}

	return &types.KubeEvent{
		UpdatedAt:    k.UpdatedAt,
		ID:           k.ID,
		ProjectID:    k.ProjectID,
		ClusterID:    k.ClusterID,
		ResourceType: k.ResourceType,
		Name:         k.Name,
		Namespace:    k.Namespace,
		OwnerType:    k.OwnerType,
		OwnerName:    k.OwnerName,
		SubEvents:    subEvents,
	}
}
