package notifications

import (
	"context"
	"strings"

	"github.com/porter-dev/porter/internal/kubernetes"
	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

type HandleNotificationInput struct {
	RawAgentEventMetadata map[string]any
	EventRepo             repository.PorterAppEventRepository
	DeploymentTargetID    string
	Namespace             string
	K8sAgent              *kubernetes.Agent
}

// HandleNotification handles the logic for processing agent events
func HandleNotification(ctx context.Context, inp HandleNotificationInput) error {
	ctx, span := telemetry.NewSpan(ctx, "handle-notification")
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

	// 4. hydrate notification with k8s deployment info
	hydratedNotification, err := hydrateNotification(ctx, hydrateNotificationInput{
		Notification:       baseNotification,
		DeploymentTargetId: inp.DeploymentTargetID,
		Namespace:          inp.Namespace,
		K8sAgent:           inp.K8sAgent,
	})
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to hydrate notification")
	}

	// 5. based on notification + k8s deployment, update the status of the matching deploy event
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

	// 6. save notification to db
	// TODO: save the notification in its own table rather than co-opting the porter app events table
	err = saveNotification(ctx, hydratedNotification, inp.EventRepo, inp.DeploymentTargetID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to save notification")
	}

	return nil
}

type Notification struct {
	AppID                string     `json:"app_id"`
	AppName              string     `json:"app_name"`
	ServiceName          string     `json:"service_name"`
	AppRevisionID        string     `json:"app_revision_id"`
	AgentEventID         int        `json:"agent_event_id"`
	AgentDetail          string     `json:"agent_detail"`
	AgentSummary         string     `json:"agent_summary"`
	HumanReadableDetail  string     `json:"human_readable_detail"`
	HumanReadableSummary string     `json:"human_readable_summary"`
	Deployment           Deployment `json:"deployment"`
}

// agentEventToNotification converts an app event to a notification
func agentEventToNotification(appEventMetadata AppEventMetadata) Notification {
	humanReadableDetail := appEventMetadata.Detail
	humanReadableDetail = strings.ReplaceAll(humanReadableDetail, "application", "service")

	notification := Notification{
		AppID:               appEventMetadata.AppID,
		AppName:             appEventMetadata.AppName,
		ServiceName:         appEventMetadata.ServiceName,
		AgentEventID:        appEventMetadata.AgentEventID,
		AgentDetail:         appEventMetadata.Detail,
		AgentSummary:        appEventMetadata.Summary,
		AppRevisionID:       appEventMetadata.AppRevisionID,
		Deployment:          Deployment{Status: DeploymentStatus_Unknown},
		HumanReadableDetail: humanReadableDetail,
	}
	return notification
}
