package notifications

import (
	"encoding/json"

	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

// AppEventMetadata is the metadata for an app event
type AppEventMetadata struct {
	// AgentEventID is the ID of the porter agent event that triggered this app event
	AgentEventID int `json:"agent_event_id"`
	// Revision is the revision number of the app when this event was fired
	Revision int `json:"revision"`
	// AppRevisionID is the revision ID of the app when this event was fired
	AppRevisionID string `json:"app_revision_id"`
	// ServiceName refers to the name of the service this event refers to
	ServiceName string `json:"service_name"`
	// ServiceType refers to the type of the service this event refers to
	ServiceType string `json:"service_type"`
	// ShortSummary is the short summary of the app event
	ShortSummary string `json:"short_summary"`
	// Summary is the summary of the app event
	Summary string `json:"summary"`
	// AppID is the ID of the app that this event refers to
	AppID string `json:"app_id"`
	// AppName is the name of the app that this event refers to
	AppName string `json:"app_name"`
	// Detail is the detail of the app event
	Detail string `json:"detail"`
	// JobRunID is the ID of the job run that this event refers to, if applicable
	JobRunID string `json:"job_run_id"`
	// DeployStatus is the status of the deployment, if applicable
	DeployStatus types.PorterAppEventStatus `json:"deploy_status"`
}

// ParseAgentEventMetadata parses raw app event metadata to a AppEventMetadata struct
func ParseAgentEventMetadata(metadata map[string]interface{}) (*AppEventMetadata, error) {
	appEventMetadata := &AppEventMetadata{}

	bytes, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(bytes, appEventMetadata)
	if err != nil {
		return nil, err
	}

	return appEventMetadata, nil
}

// NotificationFromPorterAppEvent converts a PorterAppEvent to a Notification
func NotificationFromPorterAppEvent(appEvent *models.PorterAppEvent) (*Notification, error) {
	notification := &Notification{}
	bytes, err := json.Marshal(appEvent.Metadata)
	if err != nil {
		return notification, err
	}
	err = json.Unmarshal(bytes, notification)
	if err != nil {
		return notification, err
	}

	return notification, nil
}
