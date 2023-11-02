package notifications

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/models"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

const PorterAppEventType_Notification = "NOTIFICATION"

// PorterAppEventStatus is an alias for a string that represents a Porter App Event Status
type PorterAppEventStatus string

const (
	// PorterAppEventStatus_Success represents a Porter App Event that was successful
	PorterAppEventStatus_Success PorterAppEventStatus = "SUCCESS"
	// PorterAppEventStatus_Failed represents a Porter App Event that failed
	PorterAppEventStatus_Failed PorterAppEventStatus = "FAILED"
	// PorterAppEventStatus_Progressing represents a Porter App Event that is in progress
	PorterAppEventStatus_Progressing PorterAppEventStatus = "PROGRESSING"
	// PorterAppEventStatus_Canceled represents a Porter App Event that has been canceled
	PorterAppEventStatus_Canceled PorterAppEventStatus = "CANCELED"
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
}

// ServiceDeploymentMetadata contains information about a service when it deploys, stored in the deploy event
type ServiceDeploymentMetadata struct {
	// Status is the status of the service deployment
	Status PorterAppEventStatus `json:"status"`
	// ExternalURI is the external URI of a service (if it is web)
	ExternalURI string `json:"external_uri"`
	// Type is the type of the service - one of web, worker, or job
	Type string `json:"type"`
}

// parseAgentEventMetadata parses raw app event metadata to a AppEventMetadata struct
func parseAgentEventMetadata(metadata map[string]interface{}) (*AppEventMetadata, error) {
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

// isNotificationDuplicate checks if another app event exists in the db with the same agent event id
func isNotificationDuplicate(
	ctx context.Context,
	notification Notification,
	eventRepo repository.PorterAppEventRepository,
	deploymentTargetID string,
) (bool, error) {
	ctx, span := telemetry.NewSpan(ctx, "is-notification-duplicate")
	defer span.End()

	deploymentTargetUUID, err := uuid.Parse(deploymentTargetID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error parsing deployment target id")
	}
	if deploymentTargetUUID == uuid.Nil {
		return false, telemetry.Error(ctx, span, nil, "deployment target id cannot be nil")
	}

	appIdInt, err := strconv.Atoi(notification.AppID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error converting app id to int")
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-id", Value: notification.AppID},
		telemetry.AttributeKV{Key: "app-name", Value: notification.AppName},
		telemetry.AttributeKV{Key: "app-revision-id", Value: notification.AppRevisionID},
		telemetry.AttributeKV{Key: "agent-event-id", Value: notification.AgentEventID},
		telemetry.AttributeKV{Key: "service-name", Value: notification.ServiceName},
	)

	existingEvents, _, err := eventRepo.ListEventsByPorterAppIDAndDeploymentTargetID(ctx, uint(appIdInt), deploymentTargetUUID)
	if err != nil {
		return false, telemetry.Error(ctx, span, err, "error listing porter app events for event type with deployment target id")
	}

	for _, existingEvent := range existingEvents {
		if existingEvent != nil && existingEvent.Type == PorterAppEventType_Notification {
			existingNotification, err := NotificationFromPorterAppEvent(existingEvent)
			if err != nil {
				continue
			}
			if existingNotification.AgentEventID == 0 {
				continue
			}
			if existingNotification.AgentEventID == notification.AgentEventID {
				return true, nil
			}
		}
	}

	return false, nil
}

// updateDeployEventInput is the input to updateDeployEvent
type updateDeployEventInput struct {
	Notification
	EventRepo repository.PorterAppEventRepository
	Status    PorterAppEventStatus
}

// updateDeployEvent updates the service status of a deploy event and possibly the event status itself with the input status
func updateDeployEvent(ctx context.Context, inp updateDeployEventInput) error {
	ctx, span := telemetry.NewSpan(ctx, "update-matching-deploy-event")
	defer span.End()

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "matching-k8s-deployment-status", Value: inp.Deployment.Status})

	appID, err := strconv.Atoi(inp.Notification.AppID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error converting app id to int")
	}

	matchEvent, err := inp.EventRepo.ReadDeployEventByAppRevisionID(ctx, uint(appID), inp.Notification.AppRevisionID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error finding matching deploy event")
	}
	if matchEvent.ID == uuid.Nil {
		return telemetry.Error(ctx, span, nil, "no matching deploy event found")
	}
	if matchEvent.Status != string(PorterAppEventStatus_Progressing) {
		return nil // nothing to update here
	}

	serviceStatus, ok := matchEvent.Metadata["service_deployment_metadata"]
	if !ok {
		return telemetry.Error(ctx, span, nil, "service deployment metadata not found in deploy event metadata")
	}
	serviceDeploymentGenericMap, ok := serviceStatus.(map[string]interface{})
	if !ok {
		return telemetry.Error(ctx, span, nil, "service deployment metadata is not correct type")
	}
	serviceDeploymentMap := make(map[string]ServiceDeploymentMetadata)
	for k, v := range serviceDeploymentGenericMap {
		by, err := json.Marshal(v)
		if err != nil {
			return telemetry.Error(ctx, span, nil, "unable to marshal service deployment metadata")
		}

		var serviceDeploymentMetadata ServiceDeploymentMetadata
		err = json.Unmarshal(by, &serviceDeploymentMetadata)
		if err != nil {
			return telemetry.Error(ctx, span, nil, "unable to unmarshal service deployment metadata")
		}
		serviceDeploymentMap[k] = serviceDeploymentMetadata
	}
	serviceDeploymentMetadata, ok := serviceDeploymentMap[inp.Notification.ServiceName]
	if !ok {
		return telemetry.Error(ctx, span, nil, "deployment metadata not found for service")
	}

	telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "existing-status", Value: string(serviceDeploymentMetadata.Status)})

	if serviceDeploymentMetadata.Status != PorterAppEventStatus_Progressing {
		return nil // nothing to update here
	}
	// update the map with the new status
	serviceDeploymentMetadata.Status = inp.Status
	serviceDeploymentMap[inp.Notification.ServiceName] = serviceDeploymentMetadata

	// update the deploy event with new map and status if all services are done
	matchEvent.Metadata["service_deployment_metadata"] = serviceDeploymentMap
	allServicesDone := true
	anyServicesFailed := false
	for _, deploymentMetadata := range serviceDeploymentMap {
		if deploymentMetadata.Status == PorterAppEventStatus_Progressing {
			allServicesDone = false
			break
		}
		if deploymentMetadata.Status == PorterAppEventStatus_Failed {
			anyServicesFailed = true
		}
	}
	if allServicesDone {
		matchEvent.Metadata["end_time"] = time.Now().UTC()
		if anyServicesFailed {
			matchEvent.Status = string(PorterAppEventStatus_Failed)
		} else {
			matchEvent.Status = string(PorterAppEventStatus_Success)
		}
	}

	err = inp.EventRepo.UpdateEvent(ctx, &matchEvent)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error updating deploy event")
	}

	return nil
}

// saveNotification saves a notification to the db
// TODO: save the notification in its own table rather than co-opting the porter app events table
func saveNotification(ctx context.Context, notification Notification, eventRepo repository.PorterAppEventRepository, deploymentTargetID string) error {
	ctx, span := telemetry.NewSpan(ctx, "save-notification")
	defer span.End()

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-id", Value: notification.AppID},
		telemetry.AttributeKV{Key: "app-name", Value: notification.AppName},
		telemetry.AttributeKV{Key: "app-revision-id", Value: notification.AppRevisionID},
		telemetry.AttributeKV{Key: "agent-event-id", Value: notification.AgentEventID},
		telemetry.AttributeKV{Key: "service-name", Value: notification.ServiceName},
		telemetry.AttributeKV{Key: "deployment-target-id", Value: deploymentTargetID},
	)

	appID, err := strconv.Atoi(notification.AppID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error converting app id to int")
	}

	deploymentTargetUUID, err := uuid.Parse(deploymentTargetID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error parsing deployment target id")
	}
	if deploymentTargetUUID == uuid.Nil {
		return telemetry.Error(ctx, span, err, "deployment target id cannot be nil")
	}

	notificationMap := make(map[string]any)
	bytes, err := json.Marshal(notification)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error marshaling notification")
	}
	err = json.Unmarshal(bytes, &notificationMap)
	if err != nil {
		return telemetry.Error(ctx, span, err, "error unmarshaling notification")
	}

	err = eventRepo.CreateEvent(ctx, &models.PorterAppEvent{
		ID:                 uuid.New(),
		Type:               string(PorterAppEventType_Notification),
		PorterAppID:        uint(appID),
		DeploymentTargetID: deploymentTargetUUID,
		Metadata:           notificationMap,
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "error creating porter app event")
	}

	return nil
}

// NotificationFromPorterAppEvent converts a PorterAppEvent to a Notification
func NotificationFromPorterAppEvent(appEvent *models.PorterAppEvent) (*Notification, error) {
	notification := &Notification{}
	bytes, err := json.Marshal(appEvent.Metadata)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(bytes, notification)
	if err != nil {
		return nil, err
	}

	return notification, nil
}
