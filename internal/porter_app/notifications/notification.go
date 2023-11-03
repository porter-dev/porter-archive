package notifications

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

// HandleNotificationInput is the input to HandleNotification
type HandleNotificationInput struct {
	// RawAgentEventMetadata is the raw metadata from the agent event
	RawAgentEventMetadata map[string]any
	// EventRepo is the repository for app events
	EventRepo repository.PorterAppEventRepository
	// DeploymentTargetID is the ID of the deployment target
	DeploymentTargetID string
	// Namespace is the namespace of the deployment target
	Namespace string
	// K8sAgent is the k8s agent, used to query for deployment info
	K8sAgent *kubernetes.Agent
}

// HandleNotification handles the logic for processing agent events
func HandleNotification(ctx context.Context, inp HandleNotificationInput) error {
	ctx, span := telemetry.NewSpan(ctx, "internal-handle-notification")
	defer span.End()

	// 1. parse agent event
	agentEventMetadata, err := parseAgentEventMetadata(inp.RawAgentEventMetadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to unmarshal app event metadata")
	}
	if agentEventMetadata == nil {
		return telemetry.Error(ctx, span, nil, "app event metadata is nil")
	}

	// 2. convert agent event to baseNotification
	baseNotification := agentEventToNotification(*agentEventMetadata)

	// 3. dedupe notification
	isDuplicate, err := isNotificationDuplicate(ctx, baseNotification, inp.EventRepo, inp.DeploymentTargetID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to check if app event is duplicate")
	}
	if isDuplicate {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "is-duplicate", Value: true})
		return nil
	}

	telemetry.WithAttributes(span,
		telemetry.AttributeKV{Key: "app-id", Value: baseNotification.AppID},
		telemetry.AttributeKV{Key: "app-name", Value: baseNotification.AppName},
		telemetry.AttributeKV{Key: "service-name", Value: baseNotification.ServiceName},
		telemetry.AttributeKV{Key: "app-revision-id", Value: baseNotification.AppRevisionID},
		telemetry.AttributeKV{Key: "agent-event-id", Value: baseNotification.AgentEventID},
		telemetry.AttributeKV{Key: "agent-detail", Value: baseNotification.AgentDetail},
	)

	// 4. hydrate notification with k8s deployment info
	hydratedNotification, err := hydrateNotificationWithDeployment(ctx, hydrateNotificationWithDeploymentInput{
		Notification:       baseNotification,
		DeploymentTargetId: inp.DeploymentTargetID,
		Namespace:          inp.Namespace,
		K8sAgent:           inp.K8sAgent,
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to hydrate notification with deployment")
	}

	// 5. hydrate notification with user-facing details
	hydratedNotification = hydrateNotificationWithUserFacingDetails(ctx, hydratedNotification)

	// 6. based on notification + k8s deployment, update the status of the matching deploy event
	if hydratedNotification.Deployment.Status == DeploymentStatus_Failure ||
		(hydratedNotification.Deployment.Status == DeploymentStatus_Pending &&
			detailIndicatesDeploymentFailure(hydratedNotification.AgentDetail)) {
		err = updateDeployEvent(ctx, updateDeployEventInput{
			Notification: hydratedNotification,
			EventRepo:    inp.EventRepo,
			Status:       PorterAppEventStatus_Failed,
		})
		if err != nil {
			return telemetry.Error(ctx, span, err, "failed to update deploy event matching notification")
		}
	}

	// 7. save notification to db
	err = saveNotification(ctx, hydratedNotification, inp.EventRepo, inp.DeploymentTargetID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to save notification")
	}

	return nil
}

// Notification is a struct that contains all actionable information from an app event
type Notification struct {
	// AppID is the ID of the app
	AppID string `json:"app_id"`
	// AppName is the name of the app
	AppName string `json:"app_name"`
	// ServiceName is the name of the service
	ServiceName string `json:"service_name"`
	// AppRevisionID is the ID of the app revision that the notification belongs to
	AppRevisionID string `json:"app_revision_id"`
	// AgentEventID is the ID of the agent event, used for deduping
	AgentEventID int `json:"agent_event_id"`
	// AgentDetail is the raw detail of the agent event
	AgentDetail string `json:"agent_detail"`
	// AgentSummary is the raw summary of the agent event
	AgentSummary string `json:"agent_summary"`
	// HumanReadableDetail is the agent event detail translated to user-facing form
	HumanReadableDetail string `json:"human_readable_detail"`
	// HumanReadableSummary is the agent event summary translated to user-facing form
	HumanReadableSummary string `json:"human_readable_summary"`
	// MitigationSteps is string containing steps to resolve the issue (if applicable)
	MitigationSteps string `json:"mitigation_steps"`
	// Deployment is the deployment metadata, used to determine if the notification occurred during deployment or after
	Deployment Deployment `json:"deployment"`
	// Timestamp is the time that the notification was created
	Timestamp time.Time `json:"timestamp"`
	// ID is the ID of the notification
	ID uuid.UUID `json:"id"`
}

// agentEventToNotification converts an app event to a notification
func agentEventToNotification(appEventMetadata AppEventMetadata) Notification {
	notification := Notification{
		AppID:         appEventMetadata.AppID,
		AppName:       appEventMetadata.AppName,
		ServiceName:   appEventMetadata.ServiceName,
		AgentEventID:  appEventMetadata.AgentEventID,
		AgentDetail:   appEventMetadata.Detail,
		AgentSummary:  appEventMetadata.Summary,
		AppRevisionID: appEventMetadata.AppRevisionID,
		Deployment:    Deployment{Status: DeploymentStatus_Unknown},
		Timestamp:     time.Now().UTC(),
		ID:            uuid.New(),
	}
	return notification
}
