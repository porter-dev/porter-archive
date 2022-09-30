package v2

import "time"

type ContainerEvent struct {
	Name     string `json:"container_name"`
	Reason   string `json:"reason"`
	Message  string `json:"message"`
	LogID    string `json:"log_id"`
	ExitCode int32  `json:"exit_code"`
}

type PodEvent struct {
	EventID         string                     `json:"event_id"`
	PodName         string                     `json:"pod_name"`
	Namespace       string                     `json:"namespace"`
	Cluster         string                     `json:"cluster"`
	OwnerName       string                     `json:"release_name"`
	OwnerType       string                     `json:"release_type"`
	Timestamp       int64                      `json:"timestamp"`
	Phase           string                     `json:"pod_phase"`
	Status          string                     `json:"pod_status"`
	Reason          string                     `json:"reason"`
	Message         string                     `json:"message"`
	ContainerEvents map[string]*ContainerEvent `json:"container_events"`
}

type IncidentsResponse struct {
	Incidents []*Incident `json:"incidents" form:"required"`
}

type EventsResponse struct {
	IncidentID    string      `json:"incident_id" form:"required"`
	ChartName     string      `json:"chart_name"`
	ReleaseName   string      `json:"release_name"`
	CreatedAt     int64       `json:"created_at"`
	UpdatedAt     int64       `json:"updated_at"`
	LatestState   string      `json:"latest_state"`
	LatestReason  string      `json:"latest_reason"`
	LatestMessage string      `json:"latest_message"`
	Events        []*PodEvent `json:"events" form:"required"`
}

type LogsResponse struct {
	Contents string `json:"contents" form:"required"`
}

type SeverityType string

const (
	SeverityCritical SeverityType = "critical"
	SeverityNormal   SeverityType = "normal"
)

type InvolvedObjectKind string

const (
	InvolvedObjectDeployment InvolvedObjectKind = "deployment"
	InvolvedObjectJob        InvolvedObjectKind = "job"
	InvolvedObjectPod        InvolvedObjectKind = "pod"
)

type IncidentStatus string

const (
	IncidentStatusResolved IncidentStatus = "resolved"
	IncidentStatusActive   IncidentStatus = "active"
)

type IncidentMeta struct {
	ID                      string             `json:"id" form:"required"`
	ReleaseName             string             `json:"release_name" form:"required"`
	ReleaseNamespace        string             `json:"release_namespace" form:"required"`
	ChartName               string             `json:"chart_name" form:"required"`
	CreatedAt               time.Time          `json:"created_at" form:"required"`
	UpdatedAt               time.Time          `json:"updated_at" form:"required"`
	LastSeen                *time.Time         `json:"last_seen" form:"required"`
	Status                  IncidentStatus     `json:"status" form:"required"`
	Summary                 string             `json:"summary" form:"required"`
	Severity                SeverityType       `json:"severity" form:"required"`
	InvolvedObjectKind      InvolvedObjectKind `json:"involved_object_kind" form:"required"`
	InvolvedObjectName      string             `json:"involved_object_name" form:"required"`
	InvolvedObjectNamespace string             `json:"involved_object_namespace" form:"required"`
}

type Incident struct {
	*IncidentMeta
	Pods   []string `json:"pods" form:"required"`
	Detail string   `json:"detail" form:"required"`
}
