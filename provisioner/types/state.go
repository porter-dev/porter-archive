package types

import "time"

type TFResourceStatus string

const (
	TFResourcePlannedCreate TFResourceStatus = "planned_create"
	TFResourcePlannedDelete TFResourceStatus = "planned_delete"
	TFResourceCreated       TFResourceStatus = "created"
	TFResourceCreating      TFResourceStatus = "creating"
	TFResourceUpdating      TFResourceStatus = "updating"
	TFResourceDeleting      TFResourceStatus = "deleting"
)

type TFResourceState struct {
	ID     string           `json:"id"`
	Status TFResourceStatus `json:"status"`
	Error  *string          `json:"error"`
}

type TFStateStatus string

type TFState struct {
	LastUpdated time.Time     `json:"last_updated"`
	OperationID string        `json:"operation_id"`
	Status      TFStateStatus `json:"status"`
	Resources   []*TFResourceState
}
