package notifications

import (
	"context"

	"github.com/porter-dev/porter/internal/repository"
	"github.com/porter-dev/porter/internal/telemetry"
)

type HandleNotificationInput struct {
	Context             context.Context
	RawAppEventMetadata map[string]any
	EventRepo           repository.PorterAppEventRepository
	DeploymentTargetID  string
}

// HandleNotification handles the logic for processing app events (which are currently sent by the porter agent)
func HandleNotification(inp HandleNotificationInput) error {
	ctx, span := telemetry.NewSpan(inp.Context, "handle-notification")
	defer span.End()

	// 1. unmarshal app event
	appEventMetadata, err := convertMetadata(inp.RawAppEventMetadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to unmarshal app event metadata")
	}
	if appEventMetadata == nil {
		return telemetry.Error(ctx, span, nil, "app event metadata is nil")
	}

	// 2. dedupe app event
	isDuplicate, err := checkIsAppEventDuplicate(ctx, *appEventMetadata, inp.EventRepo, inp.DeploymentTargetID)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to check if app event is duplicate")
	}
	if isDuplicate {
		telemetry.WithAttributes(span, telemetry.AttributeKV{Key: "is-duplicate", Value: true})
		return nil
	}

	// 3. convert app event to notification
	_, err = appEventToNotification(*appEventMetadata)
	if err != nil {
		return telemetry.Error(ctx, span, err, "failed to convert app event to notification")
	}

	// 4. based on notification, change the status of the deploy event
	// 5. send notification
	return nil
}

type Notification struct{}

// appEventToNotification converts an app event to a notification
func appEventToNotification(appEventMetadata AppEventMetadata) (*Notification, error) {
	return nil, nil
}
