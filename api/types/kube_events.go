package types

import "time"

const (
	URLParamKubeEventID = "kube_event_id"
)

type KubeEventType string

const (
	KubeEventTypeCritical KubeEventType = "critical"
	KubeEventTypeNormal   KubeEventType = "normal"
)

type GroupOptions struct {
	ResourceType  string
	Name          string
	Namespace     string
	ThresholdTime time.Time
}

// CreateKubeEventRequest is the type for creating a new kube event
type CreateKubeEventRequest struct {
	ResourceType string        `json:"resource_type" form:"required"`
	Name         string        `json:"name" form:"required"`
	OwnerType    string        `json:"owner_type"`
	OwnerName    string        `json:"owner_name"`
	EventType    KubeEventType `json:"event_type" form:"required"`
	Namespace    string        `json:"namespace"`
	Message      string        `json:"message" form:"required"`
	Reason       string        `json:"reason"`
	Timestamp    time.Time     `json:"timestamp" form:"required"`
}

type KubeEvent struct {
	UpdatedAt time.Time `json:"updated_at"`

	ID        uint `json:"id"`
	ProjectID uint `json:"project_id"`
	ClusterID uint `json:"cluster_id"`

	ResourceType string `json:"resource_type"`
	Name         string `json:"name"`
	OwnerType    string `json:"owner_type"`
	OwnerName    string `json:"owner_name"`
	Namespace    string `json:"namespace"`

	SubEvents []*KubeSubEvent `json:"sub_events"`
}

type KubeSubEvent struct {
	EventType KubeEventType `json:"event_type"`
	Message   string        `json:"message"`
	Reason    string        `json:"reason"`
	Timestamp time.Time     `json:"timestamp"`
}

type ListKubeEventRequest struct {
	Limit int `schema:"limit"`
	Skip  int `schema:"skip"`

	// can only be "timestamp" for now
	SortBy string `schema:"sort_by"`

	OwnerType string `schema:"owner_type"`
	OwnerName string `schema:"owner_name"`

	ResourceType string `schema:"resource_type"`
}

type ListKubeEventsResponse struct {
	Count int64 `json:"count"`
	Limit int   `json:"limit"`
	Skip  int   `json:"skip"`

	KubeEvents []*KubeEvent `json:"kube_events"`
}

type GetKubeEventLogsRequest struct {
	Timestamp int `schema:"timestamp"`
}

type GetKubeEventLogsResponse struct {
	Logs []string `json:"logs"`
}

type GetKubeEventLogBucketsResponse struct {
	LogBuckets []string `json:"log_buckets"`
}
