package v2

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

type Incident struct {
	ID            string `json:"id" form:"required"`
	ReleaseName   string `json:"release_name" form:"required"`
	CreatedAt     int64  `json:"created_at" form:"required"`
	UpdatedAt     int64  `json:"updated_at" form:"required"`
	LatestState   string `json:"latest_state" form:"required"`
	LatestReason  string `json:"latest_reason" form:"required"`
	LatestMessage string `json:"latest_message" form:"required"`
}

type IncidentsResponse struct {
	AgentVersion string      `json:"agent_version"`
	Incidents    []*Incident `json:"incidents" form:"required"`
}

type EventsResponse struct {
	AgentVersion  string      `json:"agent_version"`
	IncidentID    string      `json:"incident_id" form:"required"`
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
