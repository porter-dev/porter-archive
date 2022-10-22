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
	ShortSummary            string             `json:"short_summary"`
	Severity                SeverityType       `json:"severity" form:"required"`
	InvolvedObjectKind      InvolvedObjectKind `json:"involved_object_kind" form:"required"`
	InvolvedObjectName      string             `json:"involved_object_name" form:"required"`
	InvolvedObjectNamespace string             `json:"involved_object_namespace" form:"required"`
	ShouldViewLogs          bool               `json:"should_view_logs"`
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
	Revision     string     `json:"revision"`
}

type ListIncidentEventsRequest struct {
	*PaginationRequest
	IncidentID   *string `schema:"incident_id"`
	PodName      *string `schema:"pod_name"`
	PodNamespace *string `schema:"pod_namespace"`
	Summary      *string `schema:"summary"`
	PodPrefix    *string `schema:"pod_prefix"`
}

type ListIncidentEventsResponse struct {
	Events     []*IncidentEvent    `json:"events" form:"required"`
	Pagination *PaginationResponse `json:"pagination"`
}

type GetLogRequest struct {
	Limit       uint       `schema:"limit"`
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	SearchParam string     `schema:"search_param"`
	Revision    string     `schema:"revision"`
	PodSelector string     `schema:"pod_selector" form:"required"`
	Namespace   string     `schema:"namespace" form:"required"`
	Direction   string     `schema:"direction"`
}

type GetPodValuesRequest struct {
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	MatchPrefix string     `schema:"match_prefix"`
	Revision    string     `schema:"revision"`
}

type GetRevisionValuesRequest struct {
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	MatchPrefix string     `schema:"match_prefix"`
}

type LogLine struct {
	Timestamp *time.Time `json:"timestamp"`
	Line      string     `json:"line"`
}

type GetLogResponse struct {
	BackwardContinueTime *time.Time `json:"backward_continue_time"`
	ForwardContinueTime  *time.Time `json:"forward_continue_time"`
	Logs                 []LogLine  `json:"logs"`
}

type GetKubernetesEventRequest struct {
	Limit       uint       `schema:"limit"`
	StartRange  *time.Time `schema:"start_range"`
	EndRange    *time.Time `schema:"end_range"`
	Revision    string     `schema:"revision"`
	PodSelector string     `schema:"pod_selector" form:"required"`
	Namespace   string     `schema:"namespace" form:"required"`
}

type KubernetesEventLine struct {
	Timestamp *time.Time `json:"timestamp"`
	Event     string     `json:"event"`
}

type GetKubernetesEventResponse struct {
	ContinueTime *time.Time            `json:"continue_time"`
	Events       []KubernetesEventLine `json:"events"`
}

type EventType string

const (
	EventTypeIncident           EventType = "incident"
	EventTypeIncidentResolved   EventType = "incident_resolved"
	EventTypeDeploymentStarted  EventType = "deployment_started"
	EventTypeDeploymentFinished EventType = "deployment_finished"
	EventTypeDeploymentErrored  EventType = "deployment_errored"
)

type Event struct {
	Type             EventType              `json:"type"`
	Version          string                 `json:"version"`
	ReleaseName      string                 `json:"release_name"`
	ReleaseNamespace string                 `json:"release_namespace"`
	Timestamp        *time.Time             `json:"timestamp"`
	Data             map[string]interface{} `json:"data"`
}

type ListEventsRequest struct {
	*PaginationRequest
	ReleaseName      *string `schema:"release_name"`
	ReleaseNamespace *string `schema:"release_namespace"`
	Type             *string `schema:"type"`
}

type ListEventsResponse struct {
	Events     []*Event            `json:"events" form:"required"`
	Pagination *PaginationResponse `json:"pagination"`
}

type ListJobEventsRequest struct {
	*PaginationRequest
	ReleaseName      *string `schema:"release_name"`
	ReleaseNamespace *string `schema:"release_namespace"`
	Type             *string `schema:"type"`
	JobName          string  `schema:"job_name" form:"required"`
}
