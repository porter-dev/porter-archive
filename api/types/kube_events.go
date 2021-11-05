package types

import "time"

const (
	URLParamKubeEventID = "kube_event_id"
)

// CreateKubeEventRequest is the type for creating a new kube event
type CreateKubeEventRequest struct {
	ResourceType string    `json:"resource_type" form:"required"`
	Name         string    `json:"name" form:"required"`
	OwnerType    string    `json:"owner_type"`
	OwnerName    string    `json:"owner_name"`
	EventType    string    `json:"event_type" form:"required"`
	Namespace    string    `json:"namespace"`
	Message      string    `json:"message" form:"required"`
	Reason       string    `json:"reason"`
	Timestamp    time.Time `json:"timestamp" form:"required"`
	Data         []string  `json:"data"`
}

type KubeEventBasic struct {
	ID        uint `json:"id"`
	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	ResourceType string    `json:"resource_type"`
	Name         string    `json:"name"`
	OwnerType    string    `json:"owner_type"`
	OwnerName    string    `json:"owner_name"`
	EventType    string    `json:"event_type"`
	Namespace    string    `json:"namespace"`
	Message      string    `json:"message"`
	Reason       string    `json:"reason"`
	Timestamp    time.Time `json:"timestamp"`
}

type KubeEvent struct {
	*KubeEventBasic

	Data []byte `json:"data"`
}

type ListKubeEventRequest struct {
	Limit int    `schema:"limit"`
	Skip  int    `schema:"skip"`
	Type  string `schema:"type"`

	// can only be "timestamp" for now
	SortBy string `schema:"sort_by"`

	OwnerType string `schema:"owner_type"`
	OwnerName string `schema:"owner_name"`

	ResourceType string `schema:"resource_type"`
}
