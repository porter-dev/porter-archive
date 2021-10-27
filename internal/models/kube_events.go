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

	ResourceType string
	Name         string
	OwnerType    string
	OwnerName    string
	EventType    string
	Namespace    string
	Message      string
	Reason       string
	Timestamp    time.Time
	Data         []byte
}

// ToKubeEventType generates an external KubeEvent to be shared over REST
func (k *KubeEvent) ToKubeEventType() *types.KubeEvent {
	return &types.KubeEvent{
		KubeEventBasic: k.ToKubeEventBasicType(),
		Data:           k.Data,
	}
}

func (k *KubeEvent) ToKubeEventBasicType() *types.KubeEventBasic {
	return &types.KubeEventBasic{
		ID:           k.ID,
		ProjectID:    k.ProjectID,
		ClusterID:    k.ClusterID,
		ResourceType: k.ResourceType,
		Name:         k.Name,
		Namespace:    k.Namespace,
		OwnerType:    k.OwnerType,
		OwnerName:    k.OwnerName,
		EventType:    k.EventType,
		Message:      k.Message,
		Reason:       k.Reason,
		Timestamp:    k.Timestamp,
	}
}
