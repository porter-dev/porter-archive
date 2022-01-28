package types

import "time"

const DefaultCurrentStateFile = "current_state.json"

type TFResourceStatus string

const (
	TFResourcePlannedCreate TFResourceStatus = "planned_create"
	TFResourcePlannedDelete TFResourceStatus = "planned_delete"
	TFResourcePlannedUpdate TFResourceStatus = "planned_update"
	TFResourceCreated       TFResourceStatus = "created"
	TFResourceCreating      TFResourceStatus = "creating"
	TFResourceUpdating      TFResourceStatus = "updating"
	TFResourceDeleting      TFResourceStatus = "deleting"
	TFResourceDeleted       TFResourceStatus = "deleted"
	TFResourceErrored       TFResourceStatus = "errored"
)

type TFResourceState struct {
	ID     string           `json:"id"`
	Status TFResourceStatus `json:"status"`
	Error  *string          `json:"error"`
}

type TFStateStatus string

const (
	TFStateStatusCreated = "created"
	TFStateStatusDeleted = "deleted"
	TFStateStatusErrored = "errored"
)

type TFState struct {
	LastUpdated time.Time                   `json:"last_updated"`
	OperationID string                      `json:"operation_id"`
	Status      TFStateStatus               `json:"status"`
	Resources   map[string]*TFResourceState `json:"resources"`
}

type GetLogsResponse struct {
	Logs []string `json:"logs"`
}

const OperationScope = "operation"
