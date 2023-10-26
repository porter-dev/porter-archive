package notifications

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

const appEventType = "APP_EVENT"

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
}

// convertMetadata converts a map of interface{} to AppEventMetadata
func convertMetadata(metadata map[string]interface{}) (*AppEventMetadata, error) {
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

// checkIsAppEventDuplicate checks if an app event is a duplicate by seeing if another app event exists in the db with the same agent event id
func checkIsAppEventDuplicate(
	ctx context.Context,
	appEventMetadata AppEventMetadata,
	eventRepo repository.PorterAppEventRepository,
	deploymentTargetID string,
) (bool, error) {
	ctx, span := telemetry.NewSpan(ctx, "is-app-event-duplicate")
	defer span.End()

	deploymentTargetUUID, err := uuid.Parse(deploymentTargetID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error parsing deployment target id")
	}
	if deploymentTargetUUID == uuid.Nil {
		return false, telemetry.Error(ctx, span, nil, "deployment target id cannot be nil")
	}

	appIdInt, err := strconv.Atoi(appEventMetadata.AppID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error converting app id to int")
	}
	existingEvents, _, err := eventRepo.ListEventsByPorterAppIDAndDeploymentTargetID(ctx, uint(appIdInt), deploymentTargetUUID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error listing porter app events for event type with deployment target id")
	}

	for _, existingEvent := range existingEvents {
		if existingEvent != nil && existingEvent.Type == appEventType {
			convertedEventMetadata, err := convertMetadata(existingEvent.Metadata)
			if err != nil || convertedEventMetadata == nil {
				continue
			}
			if convertedEventMetadata.AgentEventID == 0 {
				continue
			}
			if convertedEventMetadata.AgentEventID == appEventMetadata.AgentEventID {
				return true, nil
			}
		}
	}

	return false, nil
}
