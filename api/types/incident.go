package types

import "time"

const URLParamIncidentID URLParam = "incident_id"

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

type PaginationRequest struct {
	Page int64 `schema:"page"`
}

type PaginationResponse struct {
	NumPages    int64 `json:"num_pages" form:"required"`
	CurrentPage int64 `json:"current_page" form:"required"`
	NextPage    int64 `json:"next_page" form:"required"`
}

type ListIncidentsRequest struct {
	*PaginationRequest
	Status           *IncidentStatus `schema:"status"`
	ReleaseName      *string         `schema:"release_name"`
	ReleaseNamespace *string         `schema:"release_namespace"`
}

type ListIncidentsResponse struct {
	Incidents  []*IncidentMeta     `json:"incidents" form:"required"`
	Pagination *PaginationResponse `json:"pagination"`
}

type GetIncidentResponse *Incident

type Incident struct {
	*IncidentMeta
	Pods   []string `json:"pods" form:"required"`
	Detail string   `json:"detail" form:"required"`
}

type IncidentEvent struct {
	ID           string     `json:"id" form:"required"`
	LastSeen     *time.Time `json:"last_seen" form:"required"`
	PodName      string     `json:"pod_name" form:"required"`
	PodNamespace string     `json:"pod_namespace" form:"required"`
	Summary      string     `json:"summary" form:"required"`
	Detail       string     `json:"detail" form:"required"`
}

type ListIncidentEventsRequest struct {
	*PaginationRequest
	PodName      *string `schema:"pod_name"`
	PodNamespace *string `schema:"pod_namespace"`
	Summary      *string `schema:"summary"`
}

type ListIncidentEventsResponse struct {
	Events     []*IncidentEvent    `json:"events" form:"required"`
	Pagination *PaginationResponse `json:"pagination"`
}

type GetLogRequest struct {
	Limit       uint       `schema:"limit"`
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	PodSelector string     `schema:"pod_selector" form:"required"`
	Namespace   string     `schema:"namespace" form:"required"`
}

type LogLine struct {
	Timestamp *time.Time `json:"timestamp"`
	Line      string     `json:"line"`
}

type GetLogResponse struct {
	ContinueTime *time.Time `json:"continue_time"`
	Logs         []LogLine  `json:"logs"`
}

type GetEventRequest struct {
	Limit       uint       `schema:"limit"`
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	PodSelector string     `schema:"pod_selector" form:"required"`
	Namespace   string     `schema:"namespace" form:"required"`
}

type EventLine struct {
	Timestamp *time.Time `json:"timestamp"`
	Event     string     `json:"event"`
}

type GetEventResponse struct {
	ContinueTime *time.Time  `json:"continue_time"`
	Events       []EventLine `json:"events"`
}
